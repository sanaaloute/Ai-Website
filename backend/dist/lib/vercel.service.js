"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var VercelService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VercelService = void 0;
const common_1 = require("@nestjs/common");
const env_1 = require("../config/env");
const VERCEL_API = 'https://api.vercel.com';
function timeoutSignal(ms) {
    return AbortSignal.timeout(ms);
}
let VercelService = VercelService_1 = class VercelService {
    constructor() {
        this.logger = new common_1.Logger(VercelService_1.name);
    }
    get configured() {
        return !!(0, env_1.env)().vercelToken;
    }
    async checkDomain(domain) {
        if (!this.configured) {
            return { available: true, message: 'Domain is available', conflictProjectName: null };
        }
        const projectName = this.sanitizeProjectName(this.deriveProjectName(domain));
        try {
            const res = await fetch(this.url(`/v9/projects?search=${encodeURIComponent(projectName)}`), {
                headers: this.headers(),
                signal: timeoutSignal(15_000),
            });
            if (!res.ok) {
                return { available: true, message: 'Domain appears available', conflictProjectName: null };
            }
            const data = (await res.json());
            const conflict = (data.projects ?? []).find((p) => p.name === projectName);
            return {
                available: !conflict,
                message: conflict ? 'A project with this name already exists on Vercel' : 'Domain is available',
                conflictProjectName: conflict?.name ?? null,
            };
        }
        catch (err) {
            this.logger.error(`checkDomain error: ${err instanceof Error ? err.message : String(err)}`);
            return { available: true, message: 'Domain appears available', conflictProjectName: null };
        }
    }
    async deploy(params) {
        const requestId = `req-${Date.now()}`;
        const projectName = this.sanitizeProjectName(params.projectName);
        const domainUrl = params.customDomain
            ? this.ensureUrl(params.customDomain)
            : `https://${projectName}.${(0, env_1.env)().vercelDefaultDomain || 'vercel.app'}`;
        if (!this.configured) {
            return {
                ok: true,
                appUuid: `vercel-${Date.now()}`,
                deploymentUuid: `dpl_${Date.now()}`,
                domainUrl,
                projectUrl: domainUrl,
                isUpdate: false,
                requestId,
            };
        }
        try {
            const repo = this.parseRepoFullName(params.repoUrl);
            if (!repo)
                throw new Error(`Could not parse GitHub repo from ${params.repoUrl}`);
            const project = await this.findOrCreateProject(projectName, repo);
            const projectId = project.id ?? projectName;
            const deployRes = await fetch(this.url('/v13/deployments'), {
                method: 'POST',
                headers: this.headers(),
                signal: timeoutSignal(60_000),
                body: JSON.stringify({
                    name: projectName,
                    project: projectId,
                    target: 'production',
                    gitSource: { type: 'github', repo, ref: 'main' },
                }),
            });
            if (!deployRes.ok) {
                const body = await deployRes.text();
                throw new Error(`Vercel deployment failed: ${deployRes.status} ${body}`);
            }
            const deployment = (await deployRes.json());
            if (!deployment.id)
                throw new Error('Vercel deployment did not return an id');
            const finalDomainUrl = deployment.url ? this.ensureUrl(deployment.url) : domainUrl;
            return {
                ok: true,
                appUuid: projectId,
                deploymentUuid: deployment.id,
                domainUrl: finalDomainUrl,
                projectUrl: finalDomainUrl,
                isUpdate: false,
                requestId,
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`deploy error: ${message}`);
            return { ok: false, error: message, requestId };
        }
    }
    async status(deploymentUuid, appUuid) {
        if (!this.configured) {
            return {
                success: true,
                app: { uuid: appUuid, status: 'running' },
                latestDeployment: { uuid: deploymentUuid, status: 'finished' },
            };
        }
        try {
            const res = await fetch(this.url(`/v13/deployments/${deploymentUuid}`), {
                headers: this.headers(),
                signal: timeoutSignal(20_000),
            });
            if (!res.ok) {
                const body = await res.text();
                this.logger.warn(`Vercel status lookup failed: ${res.status} ${body}`);
                return { success: false, app: { uuid: appUuid }, latestDeployment: { uuid: deploymentUuid } };
            }
            const d = (await res.json());
            const readyState = d.readyState || d.state || 'QUEUED';
            return {
                success: true,
                app: { uuid: appUuid, status: this.mapAppStatus(readyState) },
                latestDeployment: {
                    uuid: deploymentUuid,
                    status: this.mapDeploymentStatus(readyState),
                    commit_message: d.meta?.githubCommitMessage,
                    finished_at: d.ready ? new Date(d.ready).toISOString() : undefined,
                },
            };
        }
        catch (err) {
            this.logger.error(`status error: ${err instanceof Error ? err.message : String(err)}`);
            return { success: false, app: { uuid: appUuid }, latestDeployment: { uuid: deploymentUuid } };
        }
    }
    async findOrCreateProject(name, repo) {
        const createRes = await fetch(this.url('/v9/projects'), {
            method: 'POST',
            headers: this.headers(),
            signal: timeoutSignal(30_000),
            body: JSON.stringify({
                name,
                gitRepository: { type: 'github', repo },
            }),
        });
        if (createRes.ok) {
            return (await createRes.json());
        }
        if (createRes.status !== 409) {
            const body = await createRes.text();
            throw new Error(`Vercel create project failed: ${createRes.status} ${body}`);
        }
        const getRes = await fetch(this.url(`/v9/projects/${encodeURIComponent(name)}`), {
            headers: this.headers(),
            signal: timeoutSignal(15_000),
        });
        if (!getRes.ok) {
            const body = await getRes.text();
            throw new Error(`Vercel get project failed: ${getRes.status} ${body}`);
        }
        return (await getRes.json());
    }
    mapDeploymentStatus(readyState) {
        switch (readyState.toUpperCase()) {
            case 'QUEUED':
                return 'queued';
            case 'INITIALIZING':
            case 'BUILDING':
            case 'ANALYZING':
                return 'building';
            case 'READY':
                return 'finished';
            case 'ERROR':
                return 'failed';
            case 'CANCELED':
                return 'cancelled';
            default:
                return readyState.toLowerCase();
        }
    }
    mapAppStatus(readyState) {
        switch (readyState.toUpperCase()) {
            case 'READY':
                return 'running';
            case 'QUEUED':
            case 'INITIALIZING':
            case 'BUILDING':
            case 'ANALYZING':
                return 'starting';
            case 'ERROR':
                return 'failed';
            case 'CANCELED':
                return 'stopped';
            default:
                return 'starting';
        }
    }
    parseRepoFullName(repoUrl) {
        try {
            if (repoUrl.startsWith('git@')) {
                const match = repoUrl.match(/git@[^:]+:(.+?)(?:\.git)?$/);
                return match?.[1] ?? null;
            }
            const url = new URL(repoUrl);
            const path = url.pathname.replace(/^\//, '').replace(/\.git$/, '').replace(/\/+$/, '');
            return path || null;
        }
        catch {
            return null;
        }
    }
    deriveProjectName(domain) {
        const first = domain.trim().split('.')[0] || domain;
        return first.replace(/^https?:\/\//, '');
    }
    sanitizeProjectName(name) {
        const lowered = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
        const trimmed = lowered.replace(/^-+|-+$/g, '').slice(0, 100);
        return trimmed || 'lovecode-app';
    }
    ensureUrl(domain) {
        const trimmed = domain.trim();
        if (/^https?:\/\//i.test(trimmed))
            return trimmed;
        return `https://${trimmed}`;
    }
    url(path) {
        const base = `${VERCEL_API}${path}`;
        const teamId = (0, env_1.env)().vercelTeamId;
        if (!teamId)
            return base;
        return `${base}${path.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(teamId)}`;
    }
    headers() {
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${(0, env_1.env)().vercelToken}`,
        };
    }
};
exports.VercelService = VercelService;
exports.VercelService = VercelService = VercelService_1 = __decorate([
    (0, common_1.Injectable)()
], VercelService);
//# sourceMappingURL=vercel.service.js.map