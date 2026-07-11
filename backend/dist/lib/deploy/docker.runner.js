"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var DockerDeployRunner_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerDeployRunner = void 0;
const common_1 = require("@nestjs/common");
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const path = __importStar(require("node:path"));
const env_1 = require("../../config/env");
function run(cmd, args, opts = {}) {
    return new Promise((resolve) => {
        const child = (0, node_child_process_1.spawn)(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
        let stdout = '';
        let stderr = '';
        let settled = false;
        let timer = null;
        const finish = (code, err) => {
            if (settled)
                return;
            settled = true;
            if (timer)
                clearTimeout(timer);
            resolve({ code, stdout, stderr: err ? stderr + err : stderr });
        };
        if (opts.timeoutMs) {
            timer = setTimeout(() => {
                child.kill('SIGKILL');
                finish(-1, '\n[timeout]');
            }, opts.timeoutMs);
        }
        child.stdout.on('data', (d) => (stdout += String(d)));
        child.stderr.on('data', (d) => (stderr += String(d)));
        child.on('error', (e) => finish(-1, e.message));
        child.on('close', (code) => finish(code ?? -1));
    });
}
function docker(args, opts) {
    return run('docker', args, opts);
}
const RESERVED_SUBDOMAINS = new Set([
    'api',
    'admin',
    'www',
    'app',
    'mail',
    'email',
    'traefik',
    'status',
    'dashboard',
    'cdn',
    'static',
]);
let DockerDeployRunner = DockerDeployRunner_1 = class DockerDeployRunner {
    constructor() {
        this.name = 'docker';
        this.logger = new common_1.Logger(DockerDeployRunner_1.name);
    }
    get configured() {
        return (0, node_fs_1.existsSync)((0, env_1.env)().dockerSocket) || !!process.env.DOCKER_HOST;
    }
    async checkDomain(domain) {
        const slug = this.slugFromDomain(domain);
        if (this.isReserved(slug)) {
            return {
                available: false,
                message: 'This subdomain is reserved by the platform',
                conflictProjectName: slug,
            };
        }
        if (!this.configured) {
            return { available: true, message: 'Docker not available; domain appears available', conflictProjectName: null };
        }
        const res = await docker(['ps', '-a', '-q', '--filter', `name=^/${this.container(slug)}$`]);
        const exists = !!res.stdout.trim();
        return {
            available: !exists,
            message: exists ? 'A site with this name already exists on the host' : 'Domain is available',
            conflictProjectName: exists ? slug : null,
        };
    }
    async deploy(params) {
        const requestId = `docker-${Date.now()}`;
        const slug = this.sanitize(params.projectName);
        const domain = (params.customDomain || `${slug}.${(0, env_1.env)().deployBaseDomain}`).replace(/^https?:\/\//, '');
        const container = this.container(slug);
        const image = `lovecode/site-${slug}:${Date.now()}`;
        const volume = `${container}-data`;
        const workspace = path.join((0, env_1.env)().deployWorkspaceDir, slug);
        const tls = this.useTls(domain);
        const scheme = tls ? 'https' : 'http';
        const domainUrl = `${scheme}://${domain}`;
        if (!this.configured) {
            return {
                ok: false,
                requestId,
                error: 'Docker is not available on this host. Run the backend via docker-compose.selfhost.yml ' +
                    '(which mounts /var/run/docker.sock) or use DEPLOY_PROVIDER=vercel.',
            };
        }
        if (this.isReserved(slug)) {
            return { ok: false, requestId, error: `The subdomain "${slug}" is reserved by the platform.` };
        }
        try {
            await run('mkdir', ['-p', (0, env_1.env)().deployWorkspaceDir]);
            if (workspace !== (0, env_1.env)().deployWorkspaceDir && workspace.startsWith((0, env_1.env)().deployWorkspaceDir)) {
                await run('rm', ['-rf', workspace]);
            }
            let clone = await run('git', ['clone', '--depth', '1', '--branch', 'main', params.repoUrl, workspace], {
                timeoutMs: 180_000,
            });
            if (clone.code !== 0) {
                clone = await run('git', ['clone', '--depth', '1', params.repoUrl, workspace], { timeoutMs: 180_000 });
            }
            if (clone.code !== 0) {
                throw new Error(`git clone failed: ${(clone.stderr || clone.stdout).trim()} ` +
                    `(deploy only supports PUBLIC repositories; make sure the repo is public)`);
            }
            const framework = params.framework ?? this.detectFramework(workspace);
            if (framework !== 'next') {
                return {
                    ok: false,
                    requestId,
                    error: 'The docker self-host provider deploys Next.js (single-container) sites. ' +
                        'Vite + PocketBase (multi-container) sites should use DEPLOY_PROVIDER=coolify.',
                };
            }
            const build = await docker(['build', '-t', image, '--label', 'lovecode.managed=true', '--label', `lovecode.site=${slug}`, workspace], { timeoutMs: (0, env_1.env)().siteBuildTimeoutSeconds * 1000 });
            if (build.code !== 0) {
                throw new Error(`docker build failed: ${build.stderr || build.stdout}`);
            }
            await docker(['rm', '-f', container]);
            await docker(['volume', 'create', volume]);
            const runArgs = this.buildRunArgs({ slug, domain, domainUrl, tls, container, volume, image, params });
            const start = await docker(runArgs, { timeoutMs: 60_000 });
            if (start.code !== 0) {
                throw new Error(`docker run failed: ${(start.stderr || start.stdout).trim()}`);
            }
            return {
                ok: true,
                appUuid: container,
                deploymentUuid: image,
                domainUrl,
                projectUrl: domainUrl,
                isUpdate: !!params.projectId,
                requestId,
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`docker deploy error: ${message}`);
            return { ok: false, error: message, requestId };
        }
    }
    async status(deploymentUuid, appUuid) {
        const res = await docker(['inspect', appUuid], { timeoutMs: 20_000 });
        if (res.code !== 0) {
            return { success: false, app: { uuid: appUuid }, latestDeployment: { uuid: deploymentUuid } };
        }
        try {
            const info = JSON.parse(res.stdout);
            const state = info[0]?.State ?? {};
            const running = !!state.Running;
            const appStatus = running ? 'running' : state.Status === 'exited' ? 'stopped' : 'starting';
            const depStatus = running ? 'finished' : state.Status === 'exited' && state.ExitCode !== 0 ? 'failed' : 'building';
            return {
                success: true,
                app: { uuid: appUuid, status: appStatus },
                latestDeployment: {
                    uuid: deploymentUuid,
                    status: depStatus,
                    finished_at: running && state.StartedAt ? state.StartedAt : undefined,
                },
            };
        }
        catch {
            return { success: false, app: { uuid: appUuid }, latestDeployment: { uuid: deploymentUuid } };
        }
    }
    buildRunArgs(args) {
        const { slug, domain, domainUrl, tls, container, volume, image, params } = args;
        const network = (0, env_1.env)().siteNetwork;
        const router = `site-${slug}`;
        const siteEnv = {
            DATABASE_URL: 'file:./data/dev.db',
            JWT_SECRET: this.siteSecret(slug),
            NEXT_PUBLIC_APP_URL: domainUrl,
            NEXT_PUBLIC_SITE_NAME: params.projectName,
            NODE_ENV: 'production',
            ...(params.env ?? {}),
        };
        const out = [
            'run',
            '-d',
            '--name',
            container,
            '--network',
            network,
            '--restart',
            'unless-stopped',
            '--cpus',
            (0, env_1.env)().siteCpuLimit,
            '--memory',
            (0, env_1.env)().siteMemoryLimit,
            '-v',
            `${volume}:/app/data`,
            '--label',
            'lovecode.managed=true',
            '--label',
            `lovecode.site=${slug}`,
            '--label',
            'traefik.enable=true',
            '--label',
            `traefik.http.routers.${router}.rule=Host(\`${domain}\`)`,
            '--label',
            `traefik.http.routers.${router}.entrypoints=${tls ? 'websecure' : 'web'}`,
        ];
        if (tls) {
            out.push('--label', `traefik.http.routers.${router}.tls.certresolver=le`);
        }
        out.push('--label', `traefik.http.services.${router}.loadbalancer.server.port=3000`, '--label', `traefik.docker.network=${network}`);
        for (const [k, v] of Object.entries(siteEnv)) {
            out.push('-e', `${k}=${v}`);
        }
        out.push(image);
        return out;
    }
    detectFramework(workspace) {
        const next = ['next.config.ts', 'next.config.js', 'next.config.mjs'].some((f) => (0, node_fs_1.existsSync)(path.join(workspace, f)));
        if (next)
            return 'next';
        if ((0, node_fs_1.existsSync)(path.join(workspace, 'src', 'app')) && !(0, node_fs_1.existsSync)(path.join(workspace, 'vite.config.ts'))) {
            return 'next';
        }
        return 'vite';
    }
    container(slug) {
        return `site-${slug}`;
    }
    isReserved(slug) {
        return RESERVED_SUBDOMAINS.has(slug);
    }
    useTls(domain) {
        return !/(^|\.)localhost$/.test(domain) && domain !== '127.0.0.1';
    }
    siteSecret(slug) {
        return (0, node_crypto_1.createHash)('sha256').update(`${slug}:${(0, env_1.env)().adminJwtSecret}`).digest('hex');
    }
    slugFromDomain(domain) {
        const first = domain.replace(/^https?:\/\//, '').split('.')[0] || domain;
        return this.sanitize(first);
    }
    sanitize(name) {
        const lowered = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
        const trimmed = lowered.replace(/^-+|-+$/g, '').slice(0, 60);
        return trimmed || 'site';
    }
};
exports.DockerDeployRunner = DockerDeployRunner;
exports.DockerDeployRunner = DockerDeployRunner = DockerDeployRunner_1 = __decorate([
    (0, common_1.Injectable)()
], DockerDeployRunner);
//# sourceMappingURL=docker.runner.js.map