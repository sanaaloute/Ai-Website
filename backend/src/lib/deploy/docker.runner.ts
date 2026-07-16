import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { env } from '@/config/env';
import {
  DeployParams,
  DeployProvider,
  DeployResult,
  DomainCheck,
} from './deploy.types';

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Run a command WITHOUT a shell (argv array) so caller-supplied values can never
 * be interpreted as shell metacharacters. Resolves (never rejects) with the
 * exit code and captured output.
 */
function run(cmd: string, args: string[], opts: { timeoutMs?: number } = {}): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer: NodeJS.Timeout | null = null;

    const finish = (code: number, err?: string) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
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

function docker(args: string[], opts?: { timeoutMs?: number }) {
  return run('docker', args, opts);
}

// Subdomains the platform itself uses (see docker-compose.selfhost.yml). A user
// site must never squat these — the router/host would collide with the product.
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

/**
 * Self-hosted deployment provider that builds and runs user sites as Docker
 * containers on the SAME host (Docker-out-of-Docker), with Traefik labels for
 * routing + TLS. Designed for Next.js single-container sites; multi-container
 * (Vite + PocketBase) sites should use the Coolify provider.
 *
 * Host requirements (see SELFHOST.md):
 *  - the backend container has `docker` + `git` binaries and the host
 *    `/var/run/docker.sock` mounted;
 *  - DEPLOY_WORKSPACE_DIR is a bind mount at the SAME absolute path on the host
 *    and in the container (so the docker daemon can `docker build <path>`);
 *  - a shared docker network (SITE_NETWORK) exists between Traefik and sites.
 */
@Injectable()
export class DockerDeployRunner implements DeployProvider {
  readonly name = 'docker' as const;
  private readonly logger = new Logger(DockerDeployRunner.name);

  get configured(): boolean {
    // The docker socket is mounted in the self-host stack; DOCKER_HOST covers
    // remote/rootless daemons. When neither is present (plain local dev) the
    // runner degrades gracefully instead of crashing the process.
    return existsSync(env().dockerSocket) || !!process.env.DOCKER_HOST;
  }

  async checkDomain(domain: string): Promise<DomainCheck> {
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

  async deploy(params: DeployParams): Promise<DeployResult> {
    const requestId = `docker-${Date.now()}`;
    const slug = this.sanitize(params.projectName);
    const domain = (params.customDomain || `${slug}.${env().deployBaseDomain}`).replace(/^https?:\/\//, '');
    const container = this.container(slug);
    const image = `aiwebsite/site-${slug}:${Date.now()}`;
    const volume = `${container}-data`;
    const workspace = path.join(env().deployWorkspaceDir, slug);
    const tls = this.useTls(domain);
    const scheme = tls ? 'https' : 'http';
    const domainUrl = `${scheme}://${domain}`;

    if (!this.configured) {
      return {
        ok: false,
        requestId,
        error:
          'Docker is not available on this host. Run the backend via docker-compose.selfhost.yml ' +
          '(which mounts /var/run/docker.sock) or use DEPLOY_PROVIDER=vercel.',
      };
    }
    if (this.isReserved(slug)) {
      return { ok: false, requestId, error: `The subdomain "${slug}" is reserved by the platform.` };
    }

    try {
      // 1) Fetch source (shallow clone). The workspace path must be visible to
      //    both this process and the host docker daemon.
      await run('mkdir', ['-p', env().deployWorkspaceDir]);
      // Guard the path so a pathological slug can never wipe the workspace root.
      if (workspace !== env().deployWorkspaceDir && workspace.startsWith(env().deployWorkspaceDir)) {
        await run('rm', ['-rf', workspace]);
      }
      let clone = await run('git', ['clone', '--depth', '1', '--branch', 'main', params.repoUrl, workspace], {
        timeoutMs: 180_000,
      });
      if (clone.code !== 0) {
        // Fall back to the repository's default branch (not every repo uses `main`).
        clone = await run('git', ['clone', '--depth', '1', params.repoUrl, workspace], { timeoutMs: 180_000 });
      }
      if (clone.code !== 0) {
        throw new Error(
          `git clone failed: ${(clone.stderr || clone.stdout).trim()} ` +
            `(deploy only supports PUBLIC repositories; make sure the repo is public)`,
        );
      }

      // 2) Framework detection: Next.js sites deploy as a single container;
      //    Vite + PocketBase sites deploy as frontend + PocketBase containers,
      //    with Traefik routing /api to PocketBase (replacing the template's
      //    nginx sidecar).
      const framework = params.framework ?? this.detectFramework(workspace);

      // 3) Build the image from the template's Dockerfile.
      const build = await docker(
        ['build', '-t', image, '--label', 'aiwebsite.managed=true', '--label', `aiwebsite.site=${slug}`, workspace],
        { timeoutMs: env().siteBuildTimeoutSeconds * 1000 },
      );
      if (build.code !== 0) {
        throw new Error(`docker build failed: ${build.stderr || build.stdout}`);
      }

      // 3b) Vite sites need their PocketBase backend running behind /api.
      if (framework === 'vite') {
        await this.deployPocketbase({ slug, domain, tls, workspace });
      }

      // 4) Replace any previous container + ensure a persistent data volume
      //    (Next.js/SQLite only; the Vite frontend serves a static bundle).
      await docker(['rm', '-f', container]);
      if (framework === 'next') {
        await docker(['volume', 'create', volume]);
      }

      // 5) Run with resource limits, a volume for SQLite, and Traefik labels.
      const runArgs = this.buildRunArgs({ slug, domain, domainUrl, tls, container, volume, image, framework, params });
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`docker deploy error: ${message}`);
      return { ok: false, error: message, requestId };
    }
  }

  async status(deploymentUuid: string, appUuid: string): Promise<Record<string, unknown>> {
    const res = await docker(['inspect', appUuid], { timeoutMs: 20_000 });
    if (res.code !== 0) {
      return { success: false, app: { uuid: appUuid }, latestDeployment: { uuid: deploymentUuid } };
    }
    try {
      const info = JSON.parse(res.stdout) as Array<{
        State?: { Running?: boolean; Status?: string; ExitCode?: number; StartedAt?: string };
      }>;
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
    } catch {
      return { success: false, app: { uuid: appUuid }, latestDeployment: { uuid: deploymentUuid } };
    }
  }

  /**
   * Deploy the PocketBase backend for a Vite + PocketBase site. Builds the
   * template's pocketbase/Dockerfile (binary + migrations + hooks) and runs it
   * behind Traefik at Host(domain) && PathPrefix(`/api`), matching the relative
   * VITE_POCKETBASE_URL=/ baked into the frontend bundle. Traefik's rule-length
   * priority makes the /api router win over the frontend's plain Host rule.
   */
  private async deployPocketbase(args: { slug: string; domain: string; tls: boolean; workspace: string }): Promise<void> {
    const { slug, domain, tls, workspace } = args;
    const pbDir = path.join(workspace, 'pocketbase');
    if (!existsSync(path.join(pbDir, 'Dockerfile'))) {
      throw new Error('Vite + PocketBase site is missing pocketbase/Dockerfile in the exported repository.');
    }
    const network = env().siteNetwork;
    const image = `aiwebsite/site-${slug}-pb:${Date.now()}`;
    const container = `site-${slug}-pb`;
    const volume = `${container}-data`;
    const router = `site-${slug}-api`;

    const build = await docker(
      ['build', '-t', image, '--label', 'aiwebsite.managed=true', '--label', `aiwebsite.site=${slug}`, pbDir],
      { timeoutMs: env().siteBuildTimeoutSeconds * 1000 },
    );
    if (build.code !== 0) {
      throw new Error(`pocketbase docker build failed: ${build.stderr || build.stdout}`);
    }

    await docker(['rm', '-f', container]);
    await docker(['volume', 'create', volume]);

    const runArgs = [
      'run',
      '-d',
      '--name', container,
      '--network', network,
      '--restart', 'unless-stopped',
      '--cpus', env().siteCpuLimit,
      '--memory', env().siteMemoryLimit,
      '-v', `${volume}:/pb/pb_data`,
      '--label', 'aiwebsite.managed=true',
      '--label', `aiwebsite.site=${slug}`,
      '--label', 'traefik.enable=true',
      '--label', `traefik.http.routers.${router}.rule=Host(\`${domain}\`) && PathPrefix(\`/api\`)`,
      '--label', `traefik.http.routers.${router}.entrypoints=${tls ? 'websecure' : 'web'}`,
      '--label', `traefik.http.services.${router}.loadbalancer.server.port=8090`,
      '--label', `traefik.docker.network=${network}`,
    ];
    if (tls) {
      runArgs.push('--label', `traefik.http.routers.${router}.tls.certresolver=le`);
    }
    runArgs.push(image);

    const start = await docker(runArgs, { timeoutMs: 60_000 });
    if (start.code !== 0) {
      throw new Error(`pocketbase docker run failed: ${(start.stderr || start.stdout).trim()}`);
    }
  }

  private buildRunArgs(args: {
    slug: string;
    domain: string;
    domainUrl: string;
    tls: boolean;
    container: string;
    volume: string;
    image: string;
    framework: 'next' | 'vite';
    params: DeployParams;
  }): string[] {
    const { slug, domain, domainUrl, tls, container, volume, image, framework, params } = args;
    const network = env().siteNetwork;
    const router = `site-${slug}`;
    const siteEnv: Record<string, string> =
      framework === 'next'
        ? {
            DATABASE_URL: 'file:./data/dev.db',
            JWT_SECRET: this.siteSecret(slug),
            NEXT_PUBLIC_APP_URL: domainUrl,
            NEXT_PUBLIC_SITE_NAME: params.projectName,
            NODE_ENV: 'production',
            ...(params.env ?? {}),
          }
        : {
            // Vite inlines VITE_* at build time (the template Dockerfile bakes
            // VITE_POCKETBASE_URL=/), so runtime env is informational only.
            VITE_POCKETBASE_URL: '/',
            NODE_ENV: 'production',
            ...(params.env ?? {}),
          };

    const out: string[] = [
      'run',
      '-d',
      '--name',
      container,
      '--network',
      network,
      '--restart',
      'unless-stopped',
      '--cpus',
      env().siteCpuLimit,
      '--memory',
      env().siteMemoryLimit,
      '--label',
      'aiwebsite.managed=true',
      '--label',
      `aiwebsite.site=${slug}`,
      '--label',
      'traefik.enable=true',
      '--label',
      `traefik.http.routers.${router}.rule=Host(\`${domain}\`)`,
      '--label',
      `traefik.http.routers.${router}.entrypoints=${tls ? 'websecure' : 'web'}`,
    ];
    if (framework === 'next') {
      out.push('-v', `${volume}:/app/data`);
    }
    if (tls) {
      out.push('--label', `traefik.http.routers.${router}.tls.certresolver=le`);
    }
    out.push(
      '--label',
      `traefik.http.services.${router}.loadbalancer.server.port=3000`,
      '--label',
      `traefik.docker.network=${network}`,
    );
    for (const [k, v] of Object.entries(siteEnv)) {
      out.push('-e', `${k}=${v}`);
    }
    out.push(image);
    return out;
  }

  private detectFramework(workspace: string): 'next' | 'vite' {
    const next = ['next.config.ts', 'next.config.js', 'next.config.mjs'].some((f) =>
      existsSync(path.join(workspace, f)),
    );
    if (next) return 'next';
    if (existsSync(path.join(workspace, 'src', 'app')) && !existsSync(path.join(workspace, 'vite.config.ts'))) {
      return 'next';
    }
    return 'vite';
  }

  private container(slug: string): string {
    return `site-${slug}`;
  }

  private isReserved(slug: string): boolean {
    return RESERVED_SUBDOMAINS.has(slug);
  }

  private useTls(domain: string): boolean {
    // localhost / *.localhost / 127.0.0.1 can't get a public Let's Encrypt
    // cert, so serve them over plain HTTP (see SELFHOST.md).
    return !/(^|\.)localhost$/.test(domain) && domain !== '127.0.0.1';
  }

  private siteSecret(slug: string): string {
    // Stable across redeploys (so sessions survive a rebuild) but unique per site.
    return createHash('sha256').update(`${slug}:${env().adminJwtSecret}`).digest('hex');
  }

  private slugFromDomain(domain: string): string {
    const first = domain.replace(/^https?:\/\//, '').split('.')[0] || domain;
    return this.sanitize(first);
  }

  private sanitize(name: string): string {
    const lowered = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const trimmed = lowered.replace(/^-+|-+$/g, '').slice(0, 60);
    return trimmed || 'site';
  }
}
