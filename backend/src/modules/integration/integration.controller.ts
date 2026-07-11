import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Res,
  Req,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { User } from '@/types';
import { GithubService } from '@/lib/github.service';
import { DeployService } from '@/lib/deploy/deploy.service';
import { IntegrationTokenService } from '@/lib/integration-token.service';

import { E2BService } from '@/lib/e2b.service';
import { IdempotencyService } from '@/lib/idempotency.service';
import { SupabaseService } from '@/lib/supabase.service';
import { ProjectService } from '@/modules/project/project.service';
import { env } from '@/config/env';

const OAUTH_STATE_COOKIE = 'github_oauth_state';
const OAUTH_NEXT_COOKIE = 'github_oauth_next';
const GITHUB_ACCESS_COOKIE = 'github_access';
const GITHUB_REFRESH_COOKIE = 'github_refresh';

const GITHUB_PROVIDER = 'github';

@Controller('api')
export class IntegrationController {
  private readonly logger = new Logger(IntegrationController.name);

  constructor(
    private readonly github: GithubService,
    private readonly deploy: DeployService,
    private readonly tokens: IntegrationTokenService,

    private readonly e2b: E2BService,
    private readonly supabase: SupabaseService,
    private readonly idempotency: IdempotencyService,
    private readonly projectService: ProjectService,
  ) {}

  private cookieOptions(domain: string) {
    const opts: { httpOnly: boolean; path: string; domain?: string } = { httpOnly: true, path: '/' };
    if (domain && domain !== 'localhost') {
      opts.domain = domain;
    }
    return opts;
  }

  // ---------------------------------------------------------------------------
  // GitHub OAuth + push
  // ---------------------------------------------------------------------------

  @Get('github/authorize')
  authorize(@Query('next') next: string, @Res() res: Response) {
    const state = crypto.randomUUID();
    const e = env();
    const opts = this.cookieOptions(e.githubCookieDomain);
    res.cookie(OAUTH_STATE_COOKIE, state, opts);
    res.cookie(OAUTH_NEXT_COOKIE, next ?? '/', opts);
    res.redirect(this.github.authorizeUrl(state, next));
  }

  @Get('github/callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Req() req: Request, @Res() res: Response) {
    try {
      const cookies = req.headers.cookie ?? '';
      const expectedState = this.parseCookie(cookies, OAUTH_STATE_COOKIE);
      const next = this.parseCookie(cookies, OAUTH_NEXT_COOKIE) ?? '/';
      const e = env();

      if (!expectedState || expectedState !== state) {
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: 'Invalid OAuth state' });
      }

      const token = await this.github.exchangeCode(code);
      if (!token) {
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: 'OAuth exchange failed' });
      }

      const opts = this.cookieOptions(e.githubCookieDomain);
      res.clearCookie(OAUTH_STATE_COOKIE, opts);
      res.clearCookie(OAUTH_NEXT_COOKIE, opts);
      res.cookie(GITHUB_ACCESS_COOKIE, token.access_token, {
        ...opts,
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
      if (token.refresh_token) {
        res.cookie(GITHUB_REFRESH_COOKIE, token.refresh_token, {
          ...opts,
          maxAge: 1000 * 60 * 60 * 24 * 30,
        });
      }

      // Persist tokens server-side so they survive cross-device sessions.
      const accessCookie = this.parseCookie(req.headers.cookie ?? '', env().accessTokenCookieName);
      if (accessCookie) {
        try {
          const { data: userData } = await this.supabase.admin.auth.getUser(accessCookie);
          if (userData.user) {
            await this.tokens.upsert(userData.user.id, GITHUB_PROVIDER, token.access_token, token.refresh_token);
          }
        } catch (storeErr) {
          this.logger.warn(
            `Could not store GitHub tokens in DB: ${storeErr instanceof Error ? storeErr.message : String(storeErr)}`,
          );
        }
      }

      return res.redirect(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`GitHub OAuth callback error: ${message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: `GitHub callback failed: ${message}` });
    }
  }

  @Get('github/status')
  @UseGuards(AuthGuard)
  async githubStatus(@CurrentUser() user: User, @Req() req: Request, @Res() res: Response) {
    const { accessToken, refreshToken, loadedFromDb } = await this.resolveGithubTokens(
      user.id,
      req.headers.cookie ?? '',
    );

    if (!accessToken) {
      return res.json({ connected: false });
    }

    const auth = await this.github.ensureValidToken(accessToken, refreshToken);

    if (auth) {
      const opts = this.cookieOptions(env().githubCookieDomain);
      res.cookie(GITHUB_ACCESS_COOKIE, auth.accessToken, { ...opts, maxAge: 1000 * 60 * 60 * 24 * 30 });
      if (auth.refreshToken) {
        res.cookie(GITHUB_REFRESH_COOKIE, auth.refreshToken, { ...opts, maxAge: 1000 * 60 * 60 * 24 * 30 });
      }
      if (loadedFromDb || auth.accessToken !== accessToken || auth.refreshToken !== refreshToken) {
        await this.tokens.upsert(user.id, GITHUB_PROVIDER, auth.accessToken, auth.refreshToken);
      }
      return res.json({ connected: true });
    }

    return res.json({ connected: false });
  }

  @Post('github/push')
  @UseGuards(AuthGuard)
  async githubPush(
    @CurrentUser() user: User,
    @Body() body: { repoName?: string; files?: Array<{ path: string; content: string }>; aiWebsiteProjectId?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body.repoName || !body.files) throw new HttpException({ success: false, error: 'repoName and files required' }, HttpStatus.BAD_REQUEST);

    const projectId = body.aiWebsiteProjectId;

    const { accessToken, refreshToken, loadedFromDb } = await this.resolveGithubTokens(
      user.id,
      req.headers.cookie ?? '',
    );

    if (!accessToken) {
      throw new HttpException({ success: false, error: 'GitHub not connected' }, HttpStatus.UNAUTHORIZED);
    }

    const result = await this.github.push(accessToken, body.repoName, body.files, refreshToken);

    if (!result.ok) {
      const isSessionExpired = /session expired|reconnect/i.test(result.error || '');
      throw new HttpException(
        { success: false, error: result.error || 'GitHub push failed', reconnect: isSessionExpired },
        isSessionExpired ? HttpStatus.UNAUTHORIZED : HttpStatus.BAD_GATEWAY,
      );
    }

    const opts = this.cookieOptions(env().githubCookieDomain);
    const finalAccess = result.accessToken || accessToken;
    const finalRefresh = result.refreshToken || refreshToken;
    res.cookie(GITHUB_ACCESS_COOKIE, finalAccess, { ...opts, maxAge: 1000 * 60 * 60 * 24 * 30 });
    if (finalRefresh) {
      res.cookie(GITHUB_REFRESH_COOKIE, finalRefresh, { ...opts, maxAge: 1000 * 60 * 60 * 24 * 30 });
    }

    if (loadedFromDb || result.accessToken || result.refreshToken) {
      await this.tokens.upsert(user.id, GITHUB_PROVIDER, finalAccess, finalRefresh);
    }

    if (projectId && result.repoUrl) {
      await this.supabase.admin
        .from('projects')
        .update({ github_repo_url: result.repoUrl })
        .eq('id', projectId)
        .eq('user_id', user.id);

      await this.projectService.upsertAiWebsiteJson(user.id, projectId, {
        deployment: { githubRepoUrl: result.repoUrl },
      });
    }

    return result;
  }

  @Post('github/disconnect')
  @UseGuards(AuthGuard)
  async githubDisconnect(@CurrentUser() user: User, @Res({ passthrough: true }) res: Response) {
    await this.tokens.delete(user.id, GITHUB_PROVIDER);
    const opts = this.cookieOptions(env().githubCookieDomain);
    res.clearCookie(GITHUB_ACCESS_COOKIE, opts);
    res.clearCookie(GITHUB_REFRESH_COOKIE, opts);
    return { success: true, disconnected: true };
  }

  // ---------------------------------------------------------------------------
  // Vercel deploy
  // ---------------------------------------------------------------------------

  @Get('vercel/check-domain')
  @UseGuards(AuthGuard)
  async checkDomain(@Query('domain') domain: string) {
    if (!domain) throw new HttpException({ success: false, error: 'domain required' }, HttpStatus.BAD_REQUEST);
    const result = await this.deploy.checkDomain(domain);
    return { success: true, ...result };
  }

  @Post('vercel/deploy')
  @UseGuards(AuthGuard)
  async deploySite(
    @CurrentUser() user: User,
    @Body() body: { repoUrl?: string; projectName?: string; customDomain?: string; projectId?: string; idempotencyKey?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body.repoUrl || !body.projectName) {
      throw new HttpException({ success: false, error: 'repoUrl and projectName required' }, HttpStatus.BAD_REQUEST);
    }
    const repoUrl = body.repoUrl;
    const projectName = body.projectName;

    const { accessToken: githubToken, refreshToken: githubRefreshToken, loadedFromDb } = await this.resolveGithubTokens(
      user.id,
      req.headers.cookie ?? '',
    );

    if (!githubToken) {
      throw new HttpException({ success: false, error: 'GitHub access token required' }, HttpStatus.UNAUTHORIZED);
    }

    // Verify the repo exists and is reachable before asking Vercel to import it.
    const projectInfo = await this.github.getProject(githubToken, repoUrl, githubRefreshToken);
    if (!projectInfo.ok) {
      throw new HttpException(
        { success: false, error: projectInfo.error || 'Could not resolve GitHub repository' },
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Refresh the GitHub cookie/DB token if ensureValidToken rotated it.
    if (projectInfo.accessToken) {
      const opts = this.cookieOptions(env().githubCookieDomain);
      const finalAccess = projectInfo.accessToken || githubToken;
      const finalRefresh = projectInfo.refreshToken || githubRefreshToken;
      res.cookie(GITHUB_ACCESS_COOKIE, finalAccess, { ...opts, maxAge: 1000 * 60 * 60 * 24 * 30 });
      if (finalRefresh) {
        res.cookie(GITHUB_REFRESH_COOKIE, finalRefresh, { ...opts, maxAge: 1000 * 60 * 60 * 24 * 30 });
      }
      if (loadedFromDb || projectInfo.accessToken || projectInfo.refreshToken) {
        await this.tokens.upsert(user.id, GITHUB_PROVIDER, finalAccess, finalRefresh);
      }
    }

    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
    return this.idempotency.process(
      idempotencyKey,
      async () => {
        const baseDomain =
          this.deploy.activeProvider === 'vercel'
            ? env().vercelDefaultDomain || 'vercel.app'
            : env().deployBaseDomain;
        const domainUrl = body.customDomain ? `https://${body.customDomain}` : `https://${projectName}.${baseDomain}`;

        const result = await this.deploy.deploy({
          repoUrl,
          projectName,
          customDomain: body.customDomain,
          projectId: body.projectId,
        });

        if (!result.ok) {
          throw new HttpException(
            { success: false, error: result.error || 'Vercel deploy failed' },
            HttpStatus.BAD_GATEWAY,
          );
        }

        if (body.projectId && result.appUuid) {
          const appUuid = String(result.appUuid);
          const finalDomainUrl = String(result.domainUrl || domainUrl);
          const deployedAt = new Date().toISOString();
          await this.supabase.admin
            .from('projects')
            .update({
              vercel_project_id: appUuid,
              vercel_domain_url: finalDomainUrl,
              vercel_deployed_at: deployedAt,
            })
            .eq('id', body.projectId)
            .eq('user_id', user.id);

          await this.projectService.upsertAiWebsiteJson(user.id, body.projectId, {
            project: { name: projectName },
            deployment: {
              platform: this.deploy.activeProvider,
              githubRepoUrl: repoUrl,
              vercelProjectId: appUuid,
              vercelDomainUrl: finalDomainUrl,
              vercelDeployedAt: deployedAt,
            },
          });
        }
        return result;
      },
      86400,
    );
  }

  @Get('vercel/status')
  @UseGuards(AuthGuard)
  async vercelStatus(@Query('deploymentUuid') deploymentUuid: string, @Query('appUuid') appUuid: string) {
    if (!deploymentUuid || !appUuid) {
      throw new HttpException({ success: false, error: 'deploymentUuid and appUuid required' }, HttpStatus.BAD_REQUEST);
    }
    return this.deploy.status(deploymentUuid, appUuid);
  }

  // ---------------------------------------------------------------------------
  // User-supplied Supabase (sandbox) — unrelated to GitHub/Vercel
  // ---------------------------------------------------------------------------

  @Post('integrations/user-supabase/connect')
  @UseGuards(AuthGuard)
  async connectUserSupabase(@Query('sandboxId') sandboxId: string, @Body() body: { supabaseUrl?: string; supabaseAnonKey?: string }) {
    if (!sandboxId || !body.supabaseUrl) {
      throw new HttpException({ success: false, error: 'sandboxId and supabaseUrl required' }, HttpStatus.BAD_REQUEST);
    }
    const envContent = `VITE_SUPABASE_URL=${body.supabaseUrl}\nVITE_SUPABASE_ANON_KEY=${body.supabaseAnonKey ?? ''}\n`;
    await this.e2b.writeFile(sandboxId, '.env', envContent);
    return { success: true, message: 'Connected' };
  }

  @Get('integrations/user-supabase/status')
  @UseGuards(AuthGuard)
  async userSupabaseStatus(@Query('sandboxId') sandboxId: string) {
    if (!sandboxId) throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);
    const files = await this.e2b.readFiles(sandboxId);
    const env = files.files['.env'] ?? '';
    const match = env.match(/VITE_SUPABASE_URL=(.+)/);
    return { connected: !!match, supabaseUrl: match?.[1]?.trim() ?? null };
  }

  @Post('integrations/user-supabase/disconnect')
  @UseGuards(AuthGuard)
  async disconnectUserSupabase(@Query('sandboxId') sandboxId: string) {
    if (!sandboxId) throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);
    await this.e2b.writeFile(sandboxId, '.env', '');
    return { success: true, message: 'Disconnected' };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private parseCookie(cookieHeader: string, name: string): string | undefined {
    const match = cookieHeader.match(new RegExp(`(?:^|;)\\s*${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  private async resolveGithubTokens(
    userId: string,
    cookieHeader: string,
  ): Promise<{ accessToken?: string; refreshToken?: string; loadedFromDb: boolean }> {
    const accessCookie = this.parseCookie(cookieHeader, GITHUB_ACCESS_COOKIE);
    const refreshCookie = this.parseCookie(cookieHeader, GITHUB_REFRESH_COOKIE);

    if (accessCookie && refreshCookie) {
      return { accessToken: accessCookie, refreshToken: refreshCookie, loadedFromDb: false };
    }

    const stored = await this.tokens.get(userId, GITHUB_PROVIDER);

    if (!accessCookie) {
      if (stored) {
        return { accessToken: stored.accessToken, refreshToken: stored.refreshToken, loadedFromDb: true };
      }
      return { loadedFromDb: false };
    }

    // Access cookie is present but refresh cookie is missing; preserve the stored refresh token if any.
    return {
      accessToken: accessCookie,
      refreshToken: refreshCookie ?? stored?.refreshToken,
      loadedFromDb: false,
    };
  }
}
