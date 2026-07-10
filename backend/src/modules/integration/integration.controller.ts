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
import { OptionalAuthGuard } from '@/common/guards/optional-auth.guard';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { User } from '@/types';
import { GitccService } from '@/lib/gitcc.service';
import { OpenhostService } from '@/lib/openhost.service';
import { IntegrationTokenService } from '@/lib/integration-token.service';

import { E2BService } from '@/lib/e2b.service';
import { IdempotencyService } from '@/lib/idempotency.service';
import { SupabaseService } from '@/lib/supabase.service';
import { ProjectService } from '@/modules/project/project.service';
import { env } from '@/config/env';

const OAUTH_STATE_COOKIE = 'gitcc_gitlab_oauth_state';
const OAUTH_NEXT_COOKIE = 'gitcc_gitlab_oauth_next';
const GITCC_ACCESS_COOKIE = 'gitcc_gitlab_access';
const GITCC_REFRESH_COOKIE = 'gitcc_gitlab_refresh';

@Controller('api')
export class IntegrationController {
  private readonly logger = new Logger(IntegrationController.name);

  constructor(
    private readonly gitcc: GitccService,
    private readonly openhost: OpenhostService,
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

  private async resolveExistingOpenhostAppUuid(userId: string, projectId?: string): Promise<string | undefined> {
    if (!projectId) return undefined;

    const lovecode = await this.projectService.readLovecodeJson(userId, projectId);
    const fromLovecode = lovecode?.deployment?.openhostAppUuid;
    if (fromLovecode) return fromLovecode;

    const { data } = await this.supabase.admin
      .from('projects')
      .select('openhost_app_uuid')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();
    return data?.openhost_app_uuid || undefined;
  }

  @Get('gitcc/gitlab/authorize')
  authorize(@Query('next') next: string, @Res() res: Response) {
    const state = crypto.randomUUID();
    const e = env();
    const opts = this.cookieOptions(e.gitccGitlabCookieDomain);
    res.cookie(OAUTH_STATE_COOKIE, state, opts);
    res.cookie(OAUTH_NEXT_COOKIE, next ?? '/', opts);
    res.redirect(this.gitcc.authorizeUrl(state, next));
  }

  @Get('gitcc/gitlab/callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Req() req: Request, @Res() res: Response) {
    try {
      const cookies = req.headers.cookie ?? '';
      const expectedState = this.parseCookie(cookies, OAUTH_STATE_COOKIE);
      const next = this.parseCookie(cookies, OAUTH_NEXT_COOKIE) ?? '/';
      const e = env();

      if (!expectedState || expectedState !== state) {
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: 'Invalid OAuth state' });
      }

      const token = await this.gitcc.exchangeCode(code);
      if (!token) {
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, error: 'OAuth exchange failed' });
      }

      const opts = this.cookieOptions(e.gitccGitlabCookieDomain);
      res.clearCookie(OAUTH_STATE_COOKIE, opts);
      res.clearCookie(OAUTH_NEXT_COOKIE, opts);
      res.cookie(GITCC_ACCESS_COOKIE, token.access_token, {
        ...opts,
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
      if (token.refresh_token) {
        res.cookie(GITCC_REFRESH_COOKIE, token.refresh_token, {
          ...opts,
          maxAge: 1000 * 60 * 60 * 24 * 30,
        });
      }

      // Persist tokens server-side so they survive cross-device sessions.
      const lovecodeAccessCookie = this.parseCookie(req.headers.cookie ?? '', env().accessTokenCookieName);
      if (lovecodeAccessCookie) {
        try {
          const { data: userData } = await this.supabase.admin.auth.getUser(lovecodeAccessCookie);
          if (userData.user) {
            await this.tokens.upsert(userData.user.id, 'gitcc', token.access_token, token.refresh_token);
          }
        } catch (storeErr) {
          this.logger.warn(
            `Could not store GitCC tokens in DB: ${storeErr instanceof Error ? storeErr.message : String(storeErr)}`,
          );
        }
      }

      return res.redirect(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`GitCC OAuth callback error: ${message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: `GitCC callback failed: ${message}` });
    }
  }

  @Get('gitcc/gitlab/status')
  @UseGuards(AuthGuard)
  async gitccStatus(@CurrentUser() user: User, @Req() req: Request, @Res() res: Response) {
    const { accessToken, refreshToken, loadedFromDb } = await this.resolveGitccTokens(
      user.id,
      req.headers.cookie ?? '',
    );

    if (!accessToken) {
      return res.json({ connected: false });
    }

    const auth = await this.gitcc.ensureValidToken(accessToken, refreshToken);

    if (auth) {
      const opts = this.cookieOptions(env().gitccGitlabCookieDomain);
      res.cookie(GITCC_ACCESS_COOKIE, auth.accessToken, { ...opts, maxAge: 1000 * 60 * 60 * 24 * 30 });
      if (auth.refreshToken) {
        res.cookie(GITCC_REFRESH_COOKIE, auth.refreshToken, { ...opts, maxAge: 1000 * 60 * 60 * 24 * 30 });
      }
      if (loadedFromDb || auth.accessToken !== accessToken || auth.refreshToken !== refreshToken) {
        await this.tokens.upsert(user.id, 'gitcc', auth.accessToken, auth.refreshToken);
      }
      return res.json({ connected: true });
    }

    return res.json({ connected: false });
  }

  @Post('gitcc/push')
  @UseGuards(AuthGuard)
  async gitccPush(@CurrentUser() user: User, @Body() body: { repoName?: string; files?: Array<{ path: string; content: string }>; lovecodeProjectId?: string }, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (!body.repoName || !body.files) throw new HttpException({ success: false, error: 'repoName and files required' }, HttpStatus.BAD_REQUEST);

    const { accessToken, refreshToken, loadedFromDb } = await this.resolveGitccTokens(
      user.id,
      req.headers.cookie ?? '',
    );

    if (!accessToken) {
      throw new HttpException({ success: false, error: 'GitCC not connected' }, HttpStatus.UNAUTHORIZED);
    }

    const existingDeployKeyUuid = body.lovecodeProjectId
      ? await this.loadProjectDeployKeyUuid(body.lovecodeProjectId)
      : undefined;

    const result = await this.gitcc.push(
      accessToken,
      body.repoName,
      body.files,
      refreshToken,
      body.lovecodeProjectId,
      existingDeployKeyUuid ?? undefined,
    );

    if (result.ok && result.privateKeyUuid && body.lovecodeProjectId && result.privateKeyUuid !== existingDeployKeyUuid) {
      await this.saveProjectDeployKeyUuid(user.id, body.lovecodeProjectId, result.privateKeyUuid);
    }

    if (!result.ok) {
      const isSessionExpired = /session expired|reconnect/i.test(result.error || '');
      throw new HttpException(
        { success: false, error: result.error || 'GitCC push failed', reconnect: isSessionExpired },
        isSessionExpired ? HttpStatus.UNAUTHORIZED : HttpStatus.BAD_GATEWAY,
      );
    }

    const opts = this.cookieOptions(env().gitccGitlabCookieDomain);
    const finalAccess = result.accessToken || accessToken;
    const finalRefresh = result.refreshToken || refreshToken;
    res.cookie(GITCC_ACCESS_COOKIE, finalAccess, { ...opts, maxAge: 1000 * 60 * 60 * 24 * 30 });
    if (finalRefresh) {
      res.cookie(GITCC_REFRESH_COOKIE, finalRefresh, { ...opts, maxAge: 1000 * 60 * 60 * 24 * 30 });
    }

    if (loadedFromDb || result.accessToken || result.refreshToken) {
      await this.tokens.upsert(user.id, 'gitcc', finalAccess, finalRefresh);
    }

    if (body.lovecodeProjectId && result.repoUrl) {
      await this.supabase.admin
        .from('projects')
        .update({ gitcc_repo_url: result.repoUrl })
        .eq('id', body.lovecodeProjectId)
        .eq('user_id', user.id);

      await this.projectService.upsertLovecodeJson(user.id, body.lovecodeProjectId, {
        deployment: {
          gitccRepoUrl: result.repoUrl,
          ...(result.publicKey ? { gitccDeployKeyPublic: result.publicKey } : {}),
        },
      });
    }

    return result;
  }

  @Post('gitcc/disconnect')
  @UseGuards(AuthGuard)
  async gitccDisconnect(@CurrentUser() user: User, @Res({ passthrough: true }) res: Response) {
    await this.tokens.delete(user.id, 'gitcc');
    const opts = this.cookieOptions(env().gitccGitlabCookieDomain);
    res.clearCookie(GITCC_ACCESS_COOKIE, opts);
    res.clearCookie(GITCC_REFRESH_COOKIE, opts);
    return { success: true, disconnected: true };
  }

  @Get('openhost/check-domain')
  @UseGuards(AuthGuard)
  async checkDomain(@Query('domain') domain: string) {
    if (!domain) throw new HttpException({ success: false, error: 'domain required' }, HttpStatus.BAD_REQUEST);
    const result = await this.openhost.checkDomain(domain);
    return { success: true, ...result };
  }

  @Post('openhost/deploy')
  @UseGuards(AuthGuard)
  async deploy(
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

    const { accessToken: gitccToken, refreshToken: gitccRefreshToken, loadedFromDb } = await this.resolveGitccTokens(
      user.id,
      req.headers.cookie ?? '',
    );

    if (!gitccToken) {
      throw new HttpException({ success: false, error: 'GitCC access token required' }, HttpStatus.UNAUTHORIZED);
    }

    const projectInfo = await this.gitcc.getProject(gitccToken, repoUrl, gitccRefreshToken);
    if (!projectInfo.ok) {
      throw new HttpException(
        { success: false, error: projectInfo.error || 'Could not resolve GitCC project' },
        HttpStatus.BAD_GATEWAY,
      );
    }
    // GitCC is a self-hosted GitLab instance. OpenHost/Coolify's public application
    // endpoint is designed for GitHub-style public repos and strips the host from
    // self-hosted URLs, so we always use the private-deploy-key endpoint with SSH.
    const existingDeployKeyUuid = body.projectId
      ? await this.loadProjectDeployKeyUuid(body.projectId)
      : undefined;
    const existingLovecode = body.projectId
      ? await this.projectService.readLovecodeJson(user.id, body.projectId)
      : null;
    const existingPublicKey = existingLovecode?.deployment?.gitccDeployKeyPublic || undefined;

    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
    return this.idempotency.process(
      idempotencyKey,
      async () => {
        const deployKeyResult = await this.gitcc.ensureDeployKey(gitccToken!, repoUrl, gitccRefreshToken, {
          existingPrivateKeyUuid: existingDeployKeyUuid ?? undefined,
          existingPublicKey,
        });
        if (!deployKeyResult.ok) {
          const isSessionExpired = /session expired|reconnect/i.test(deployKeyResult.error || '');
          throw new HttpException(
            { success: false, error: deployKeyResult.error || 'GitCC deploy-key setup failed', reconnect: isSessionExpired },
            isSessionExpired ? HttpStatus.UNAUTHORIZED : HttpStatus.BAD_GATEWAY,
          );
        }

        const opts = this.cookieOptions(env().gitccGitlabCookieDomain);
        const finalAccess = deployKeyResult.accessToken || gitccToken!;
        const finalRefresh = deployKeyResult.refreshToken || gitccRefreshToken;
        res.cookie(GITCC_ACCESS_COOKIE, finalAccess, { ...opts, maxAge: 1000 * 60 * 60 * 24 * 30 });
        if (finalRefresh) {
          res.cookie(GITCC_REFRESH_COOKIE, finalRefresh, { ...opts, maxAge: 1000 * 60 * 60 * 24 * 30 });
        }
        if (loadedFromDb || deployKeyResult.accessToken || deployKeyResult.refreshToken) {
          await this.tokens.upsert(user.id, 'gitcc', finalAccess, finalRefresh);
        }
        if (deployKeyResult.privateKeyUuid && body.projectId && deployKeyResult.privateKeyUuid !== existingDeployKeyUuid) {
          await this.saveProjectDeployKeyUuid(user.id, body.projectId, deployKeyResult.privateKeyUuid);
        }

        // TEMPORARY: treat every deploy as a fresh deployment for testing.
        // Uncomment the line below to restore redeployment behavior.
        // let existingAppUuid = await this.resolveExistingOpenhostAppUuid(user.id, body.projectId);
        let existingAppUuid: string | undefined = undefined;
        const domainUrl = body.customDomain
          ? `https://${body.customDomain}`
          : `https://${projectName}.${this.openhost.baseDomain()}`;

        // existing deployment check is disabled for now; always perform a fresh deploy.
        // if (existingAppUuid && repoIsPublic) {
        //   this.logger.log(`Deleting existing OpenHost application ${existingAppUuid} to recreate as public HTTPS app`);
        //   try {
        //     await this.openhost.deleteApplication(existingAppUuid);
        //     existingAppUuid = undefined;
        //   } catch (deleteErr) {
        //     const deleteMessage = deleteErr instanceof Error ? deleteErr.message : String(deleteErr);
        //     this.logger.warn(`Could not delete existing OpenHost application ${existingAppUuid}: ${deleteMessage}`);
        //   }
        // }

        let result: Record<string, unknown>;
        result = await this.openhost.deploy({
          repoUrl,
          sshUrl: deployKeyResult!.sshUrl,
          projectName,
          customDomain: body.customDomain,
          projectId: body.projectId,
          privateKeyUuid: deployKeyResult!.privateKeyUuid,
        });

        if (body.projectId && result.appUuid) {
          const appUuid = String(result.appUuid);
          const finalDomainUrl = String(result.domainUrl || domainUrl);
          await this.supabase.admin
            .from('projects')
            .update({
              openhost_app_uuid: appUuid,
              openhost_domain_url: finalDomainUrl,
              openhost_deployed_at: new Date().toISOString(),
            })
            .eq('id', body.projectId)
            .eq('user_id', user.id);

          await this.projectService.upsertLovecodeJson(user.id, body.projectId, {
            project: { name: projectName },
            deployment: {
              ...(deployKeyResult?.publicKey ? { gitccDeployKeyPublic: deployKeyResult.publicKey } : {}),
              openhostAppUuid: appUuid,
              openhostDomainUrl: finalDomainUrl,
              openhostDeployedAt: new Date().toISOString(),
            },
          });
        }
        return result;
      },
      86400,
    );
  }

  @Post('openhost/deploy-pocketbase')
  @UseGuards(AuthGuard)
  async deployPocketBase(
    @CurrentUser() user: User,
    @Body() body: { repoUrl?: string; projectName?: string; frontendDomain?: string; projectId?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body.repoUrl || !body.projectName || !body.frontendDomain) {
      throw new HttpException(
        { success: false, error: 'repoUrl, projectName, and frontendDomain required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const { accessToken: gitccToken, refreshToken: gitccRefreshToken, loadedFromDb } = await this.resolveGitccTokens(
      user.id,
      req.headers.cookie ?? '',
    );

    if (!gitccToken) {
      throw new HttpException({ success: false, error: 'GitCC access token required' }, HttpStatus.UNAUTHORIZED);
    }

    const projectInfo = await this.gitcc.getProject(gitccToken, body.repoUrl, gitccRefreshToken);
    if (!projectInfo.ok) {
      throw new HttpException(
        { success: false, error: projectInfo.error || 'Could not resolve GitCC project' },
        HttpStatus.BAD_GATEWAY,
      );
    }
    // GitCC is a self-hosted GitLab instance. OpenHost/Coolify's public application
    // endpoint is designed for GitHub-style public repos and strips the host from
    // self-hosted URLs, so we always use the private-deploy-key endpoint with SSH.
    const existingDeployKeyUuid = body.projectId
      ? await this.loadProjectDeployKeyUuid(body.projectId)
      : undefined;
    const existingLovecode = body.projectId
      ? await this.projectService.readLovecodeJson(user.id, body.projectId)
      : null;
    const existingPublicKey = existingLovecode?.deployment?.gitccDeployKeyPublic || undefined;

    const deployKeyResult = await this.gitcc.ensureDeployKey(gitccToken, body.repoUrl, gitccRefreshToken, {
      existingPrivateKeyUuid: existingDeployKeyUuid ?? undefined,
      existingPublicKey,
    });
    if (!deployKeyResult.ok) {
      const isSessionExpired = /session expired|reconnect/i.test(deployKeyResult.error || '');
      throw new HttpException(
        { success: false, error: deployKeyResult.error || 'GitCC deploy-key setup failed', reconnect: isSessionExpired },
        isSessionExpired ? HttpStatus.UNAUTHORIZED : HttpStatus.BAD_GATEWAY,
      );
    }

    const opts = this.cookieOptions(env().gitccGitlabCookieDomain);
    const finalAccess = deployKeyResult.accessToken || gitccToken;
    const finalRefresh = deployKeyResult.refreshToken || gitccRefreshToken;
    res.cookie(GITCC_ACCESS_COOKIE, finalAccess, { ...opts, maxAge: 1000 * 60 * 60 * 24 * 30 });
    if (finalRefresh) {
      res.cookie(GITCC_REFRESH_COOKIE, finalRefresh, { ...opts, maxAge: 1000 * 60 * 60 * 24 * 30 });
    }
    if (loadedFromDb || deployKeyResult.accessToken || deployKeyResult.refreshToken) {
      await this.tokens.upsert(user.id, 'gitcc', finalAccess, finalRefresh);
    }
    if (deployKeyResult.privateKeyUuid && body.projectId && deployKeyResult.privateKeyUuid !== existingDeployKeyUuid) {
      await this.saveProjectDeployKeyUuid(user.id, body.projectId, deployKeyResult.privateKeyUuid);
    }

    // TEMPORARY: treat every deploy as a fresh deployment for testing.
    // Uncomment the line below to restore redeployment behavior.
    // let existingAppUuid = await this.resolveExistingOpenhostAppUuid(user.id, body.projectId);
    let existingAppUuid: string | undefined = undefined;
    const domainUrl = `https://${body.frontendDomain}`;

    // existing deployment check is disabled for now; always perform a fresh deploy.
    // if (existingAppUuid && repoIsPublic) {
    //   this.logger.log(`Deleting existing OpenHost application ${existingAppUuid} to recreate as public HTTPS app`);
    //   try {
    //     await this.openhost.deleteApplication(existingAppUuid);
    //     existingAppUuid = undefined;
    //   } catch (deleteErr) {
    //     const deleteMessage = deleteErr instanceof Error ? deleteErr.message : String(deleteErr);
    //     this.logger.warn(`Could not delete existing OpenHost application ${existingAppUuid}: ${deleteMessage}`);
    //   }
    // }

    let result: Record<string, unknown>;
    result = await this.openhost.deployPocketBaseProject({
      repoUrl: body.repoUrl,
      sshUrl: deployKeyResult!.sshUrl,
      projectName: body.projectName,
      frontendDomain: body.frontendDomain,
      projectId: body.projectId,
      privateKeyUuid: deployKeyResult!.privateKeyUuid,
    });

    const response = {
      ...result,
      pocketbaseUrl: result.pocketbaseUrl || `${result.domainUrl || domainUrl}/api`,
    };

    if (body.projectId && result.appUuid) {
      const deployedAt = new Date().toISOString();
      const appUuid = String(result.appUuid);
      const finalDomainUrl = String(result.domainUrl || domainUrl);
      const adminUrl = String(result.adminUrl || `${finalDomainUrl}/admin`);
      const pocketbaseUrl = String(result.pocketbaseUrl || `${finalDomainUrl}/api`);
      await this.supabase.admin
        .from('projects')
        .update({
          openhost_app_uuid: appUuid,
          openhost_domain_url: finalDomainUrl,
          pocketbase_url: pocketbaseUrl,
          pocketbase_admin_url: adminUrl,
          openhost_deployed_at: deployedAt,
        })
        .eq('id', body.projectId)
        .eq('user_id', user.id);

      await this.projectService.upsertLovecodeJson(user.id, body.projectId, {
        project: { name: body.projectName },
        deployment: {
          ...(deployKeyResult?.publicKey ? { gitccDeployKeyPublic: deployKeyResult.publicKey } : {}),
          openhostAppUuid: appUuid,
          openhostDomainUrl: finalDomainUrl,
          openhostDeployedAt: deployedAt,
          pocketbaseUrl,
          pocketbaseAdminUrl: adminUrl,
        },
      });
    }

    return response;
  }

  @Get('openhost/status')
  @UseGuards(AuthGuard)
  async openhostStatus(@Query('deploymentUuid') deploymentUuid: string, @Query('appUuid') appUuid: string) {
    if (!deploymentUuid || !appUuid) {
      throw new HttpException({ success: false, error: 'deploymentUuid and appUuid required' }, HttpStatus.BAD_REQUEST);
    }
    return this.openhost.status(deploymentUuid, appUuid);
  }

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

  private parseCookie(cookieHeader: string, name: string): string | undefined {
    const match = cookieHeader.match(new RegExp(`(?:^|;)\\s*${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  private async resolveGitccTokens(
    userId: string,
    cookieHeader: string,
  ): Promise<{ accessToken?: string; refreshToken?: string; loadedFromDb: boolean }> {
    const accessCookie = this.parseCookie(cookieHeader, GITCC_ACCESS_COOKIE);
    const refreshCookie = this.parseCookie(cookieHeader, GITCC_REFRESH_COOKIE);

    if (accessCookie && refreshCookie) {
      return { accessToken: accessCookie, refreshToken: refreshCookie, loadedFromDb: false };
    }

    const stored = await this.tokens.get(userId, 'gitcc');

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

  private async loadProjectDeployKeyUuid(projectId: string): Promise<string | null> {
    try {
      const { data } = await this.supabase.admin
        .from('projects')
        .select('gitcc_deploy_key_uuid')
        .eq('id', projectId)
        .single();
      return (data?.gitcc_deploy_key_uuid as string) || null;
    } catch (err) {
      this.logger.warn(`Could not load deploy key uuid for project ${projectId}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  private async saveProjectDeployKeyUuid(userId: string, projectId: string, uuid: string): Promise<void> {
    try {
      await this.supabase.admin
        .from('projects')
        .update({ gitcc_deploy_key_uuid: uuid })
        .eq('id', projectId)
        .eq('user_id', userId);
    } catch (err) {
      this.logger.warn(`Could not save deploy key uuid for project ${projectId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
