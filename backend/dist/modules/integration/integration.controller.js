"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var IntegrationController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/guards/auth.guard");
const user_decorator_1 = require("../../common/decorators/user.decorator");
const github_service_1 = require("../../lib/github.service");
const deploy_service_1 = require("../../lib/deploy/deploy.service");
const integration_token_service_1 = require("../../lib/integration-token.service");
const e2b_service_1 = require("../../lib/e2b.service");
const idempotency_service_1 = require("../../lib/idempotency.service");
const supabase_service_1 = require("../../lib/supabase.service");
const project_service_1 = require("../project/project.service");
const env_1 = require("../../config/env");
const OAUTH_STATE_COOKIE = 'github_oauth_state';
const OAUTH_NEXT_COOKIE = 'github_oauth_next';
const GITHUB_ACCESS_COOKIE = 'github_access';
const GITHUB_REFRESH_COOKIE = 'github_refresh';
const GITHUB_PROVIDER = 'github';
let IntegrationController = IntegrationController_1 = class IntegrationController {
    constructor(github, deploy, tokens, e2b, supabase, idempotency, projectService) {
        this.github = github;
        this.deploy = deploy;
        this.tokens = tokens;
        this.e2b = e2b;
        this.supabase = supabase;
        this.idempotency = idempotency;
        this.projectService = projectService;
        this.logger = new common_1.Logger(IntegrationController_1.name);
    }
    cookieOptions(domain) {
        const opts = { httpOnly: true, path: '/' };
        if (domain && domain !== 'localhost') {
            opts.domain = domain;
        }
        return opts;
    }
    authorize(next, res) {
        const state = crypto.randomUUID();
        const e = (0, env_1.env)();
        const opts = this.cookieOptions(e.githubCookieDomain);
        res.cookie(OAUTH_STATE_COOKIE, state, opts);
        res.cookie(OAUTH_NEXT_COOKIE, next ?? '/', opts);
        res.redirect(this.github.authorizeUrl(state, next));
    }
    async callback(code, state, req, res) {
        try {
            const cookies = req.headers.cookie ?? '';
            const expectedState = this.parseCookie(cookies, OAUTH_STATE_COOKIE);
            const next = this.parseCookie(cookies, OAUTH_NEXT_COOKIE) ?? '/';
            const e = (0, env_1.env)();
            if (!expectedState || expectedState !== state) {
                return res.status(common_1.HttpStatus.BAD_REQUEST).json({ success: false, error: 'Invalid OAuth state' });
            }
            const token = await this.github.exchangeCode(code);
            if (!token) {
                return res.status(common_1.HttpStatus.BAD_REQUEST).json({ success: false, error: 'OAuth exchange failed' });
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
            const lovecodeAccessCookie = this.parseCookie(req.headers.cookie ?? '', (0, env_1.env)().accessTokenCookieName);
            if (lovecodeAccessCookie) {
                try {
                    const { data: userData } = await this.supabase.admin.auth.getUser(lovecodeAccessCookie);
                    if (userData.user) {
                        await this.tokens.upsert(userData.user.id, GITHUB_PROVIDER, token.access_token, token.refresh_token);
                    }
                }
                catch (storeErr) {
                    this.logger.warn(`Could not store GitHub tokens in DB: ${storeErr instanceof Error ? storeErr.message : String(storeErr)}`);
                }
            }
            return res.redirect(next);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`GitHub OAuth callback error: ${message}`);
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: `GitHub callback failed: ${message}` });
        }
    }
    async githubStatus(user, req, res) {
        const { accessToken, refreshToken, loadedFromDb } = await this.resolveGithubTokens(user.id, req.headers.cookie ?? '');
        if (!accessToken) {
            return res.json({ connected: false });
        }
        const auth = await this.github.ensureValidToken(accessToken, refreshToken);
        if (auth) {
            const opts = this.cookieOptions((0, env_1.env)().githubCookieDomain);
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
    async githubPush(user, body, req, res) {
        if (!body.repoName || !body.files)
            throw new common_1.HttpException({ success: false, error: 'repoName and files required' }, common_1.HttpStatus.BAD_REQUEST);
        const projectId = body.lovecodeProjectId || body.aiWebsiteProjectId;
        const { accessToken, refreshToken, loadedFromDb } = await this.resolveGithubTokens(user.id, req.headers.cookie ?? '');
        if (!accessToken) {
            throw new common_1.HttpException({ success: false, error: 'GitHub not connected' }, common_1.HttpStatus.UNAUTHORIZED);
        }
        const result = await this.github.push(accessToken, body.repoName, body.files, refreshToken);
        if (!result.ok) {
            const isSessionExpired = /session expired|reconnect/i.test(result.error || '');
            throw new common_1.HttpException({ success: false, error: result.error || 'GitHub push failed', reconnect: isSessionExpired }, isSessionExpired ? common_1.HttpStatus.UNAUTHORIZED : common_1.HttpStatus.BAD_GATEWAY);
        }
        const opts = this.cookieOptions((0, env_1.env)().githubCookieDomain);
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
            await this.projectService.upsertLovecodeJson(user.id, projectId, {
                deployment: { githubRepoUrl: result.repoUrl },
            });
        }
        return result;
    }
    async githubDisconnect(user, res) {
        await this.tokens.delete(user.id, GITHUB_PROVIDER);
        const opts = this.cookieOptions((0, env_1.env)().githubCookieDomain);
        res.clearCookie(GITHUB_ACCESS_COOKIE, opts);
        res.clearCookie(GITHUB_REFRESH_COOKIE, opts);
        return { success: true, disconnected: true };
    }
    async checkDomain(domain) {
        if (!domain)
            throw new common_1.HttpException({ success: false, error: 'domain required' }, common_1.HttpStatus.BAD_REQUEST);
        const result = await this.deploy.checkDomain(domain);
        return { success: true, ...result };
    }
    async deploy(user, body, req, res) {
        if (!body.repoUrl || !body.projectName) {
            throw new common_1.HttpException({ success: false, error: 'repoUrl and projectName required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const repoUrl = body.repoUrl;
        const projectName = body.projectName;
        const { accessToken: githubToken, refreshToken: githubRefreshToken, loadedFromDb } = await this.resolveGithubTokens(user.id, req.headers.cookie ?? '');
        if (!githubToken) {
            throw new common_1.HttpException({ success: false, error: 'GitHub access token required' }, common_1.HttpStatus.UNAUTHORIZED);
        }
        const projectInfo = await this.github.getProject(githubToken, repoUrl, githubRefreshToken);
        if (!projectInfo.ok) {
            throw new common_1.HttpException({ success: false, error: projectInfo.error || 'Could not resolve GitHub repository' }, common_1.HttpStatus.BAD_GATEWAY);
        }
        if (projectInfo.accessToken) {
            const opts = this.cookieOptions((0, env_1.env)().githubCookieDomain);
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
        return this.idempotency.process(idempotencyKey, async () => {
            const baseDomain = this.deploy.activeProvider === 'vercel'
                ? (0, env_1.env)().vercelDefaultDomain || 'vercel.app'
                : (0, env_1.env)().deployBaseDomain;
            const domainUrl = body.customDomain ? `https://${body.customDomain}` : `https://${projectName}.${baseDomain}`;
            const result = await this.deploy.deploy({
                repoUrl,
                projectName,
                customDomain: body.customDomain,
                projectId: body.projectId,
            });
            if (!result.ok) {
                throw new common_1.HttpException({ success: false, error: result.error || 'Vercel deploy failed' }, common_1.HttpStatus.BAD_GATEWAY);
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
                await this.projectService.upsertLovecodeJson(user.id, body.projectId, {
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
        }, 86400);
    }
    async vercelStatus(deploymentUuid, appUuid) {
        if (!deploymentUuid || !appUuid) {
            throw new common_1.HttpException({ success: false, error: 'deploymentUuid and appUuid required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        return this.deploy.status(deploymentUuid, appUuid);
    }
    async connectUserSupabase(sandboxId, body) {
        if (!sandboxId || !body.supabaseUrl) {
            throw new common_1.HttpException({ success: false, error: 'sandboxId and supabaseUrl required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const envContent = `VITE_SUPABASE_URL=${body.supabaseUrl}\nVITE_SUPABASE_ANON_KEY=${body.supabaseAnonKey ?? ''}\n`;
        await this.e2b.writeFile(sandboxId, '.env', envContent);
        return { success: true, message: 'Connected' };
    }
    async userSupabaseStatus(sandboxId) {
        if (!sandboxId)
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        const files = await this.e2b.readFiles(sandboxId);
        const env = files.files['.env'] ?? '';
        const match = env.match(/VITE_SUPABASE_URL=(.+)/);
        return { connected: !!match, supabaseUrl: match?.[1]?.trim() ?? null };
    }
    async disconnectUserSupabase(sandboxId) {
        if (!sandboxId)
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        await this.e2b.writeFile(sandboxId, '.env', '');
        return { success: true, message: 'Disconnected' };
    }
    parseCookie(cookieHeader, name) {
        const match = cookieHeader.match(new RegExp(`(?:^|;)\\s*${name}=([^;]+)`));
        return match ? decodeURIComponent(match[1]) : undefined;
    }
    async resolveGithubTokens(userId, cookieHeader) {
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
        return {
            accessToken: accessCookie,
            refreshToken: refreshCookie ?? stored?.refreshToken,
            loadedFromDb: false,
        };
    }
};
exports.IntegrationController = IntegrationController;
__decorate([
    (0, common_1.Get)('github/authorize'),
    __param(0, (0, common_1.Query)('next')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], IntegrationController.prototype, "authorize", null);
__decorate([
    (0, common_1.Get)('github/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "callback", null);
__decorate([
    (0, common_1.Get)('github/status'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "githubStatus", null);
__decorate([
    (0, common_1.Post)('github/push'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "githubPush", null);
__decorate([
    (0, common_1.Post)('github/disconnect'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "githubDisconnect", null);
__decorate([
    (0, common_1.Get)('vercel/check-domain'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Query)('domain')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "checkDomain", null);
__decorate([
    (0, common_1.Post)('vercel/deploy'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "deploy", null);
__decorate([
    (0, common_1.Get)('vercel/status'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Query)('deploymentUuid')),
    __param(1, (0, common_1.Query)('appUuid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "vercelStatus", null);
__decorate([
    (0, common_1.Post)('integrations/user-supabase/connect'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Query)('sandboxId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "connectUserSupabase", null);
__decorate([
    (0, common_1.Get)('integrations/user-supabase/status'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Query)('sandboxId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "userSupabaseStatus", null);
__decorate([
    (0, common_1.Post)('integrations/user-supabase/disconnect'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Query)('sandboxId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IntegrationController.prototype, "disconnectUserSupabase", null);
exports.IntegrationController = IntegrationController = IntegrationController_1 = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [github_service_1.GithubService,
        deploy_service_1.DeployService,
        integration_token_service_1.IntegrationTokenService,
        e2b_service_1.E2BService,
        supabase_service_1.SupabaseService,
        idempotency_service_1.IdempotencyService,
        project_service_1.ProjectService])
], IntegrationController);
//# sourceMappingURL=integration.controller.js.map