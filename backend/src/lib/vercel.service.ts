import { Injectable, Logger } from '@nestjs/common';
import { env } from '@/config/env';

const VERCEL_API = 'https://api.vercel.com';

function timeoutSignal(ms: number): AbortSignal {
  return (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout(ms);
}

export interface VercelDeployResult {
  ok: boolean;
  appUuid?: string;
  deploymentUuid?: string;
  domainUrl?: string;
  projectUrl?: string;
  isUpdate?: boolean;
  requestId?: string;
  error?: string;
}

@Injectable()
export class VercelService {
  private readonly logger = new Logger(VercelService.name);

  get configured(): boolean {
    return !!env().vercelToken;
  }

  /**
   * Check whether a deployment target is available. For the default Vercel flow
   * the "domain" is `<project>.vercel.app`, so availability maps to whether a
   * Vercel project with that name already exists in the account/team.
   */
  async checkDomain(domain: string): Promise<{ available: boolean; message: string; conflictProjectName: string | null }> {
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
      const data = (await res.json()) as { projects?: Array<{ name?: string }> };
      const conflict = (data.projects ?? []).find((p) => p.name === projectName);
      return {
        available: !conflict,
        message: conflict ? 'A project with this name already exists on Vercel' : 'Domain is available',
        conflictProjectName: conflict?.name ?? null,
      };
    } catch (err) {
      this.logger.error(`checkDomain error: ${err instanceof Error ? err.message : String(err)}`);
      return { available: true, message: 'Domain appears available', conflictProjectName: null };
    }
  }

  async deploy(params: {
    repoUrl: string;
    projectName: string;
    customDomain?: string;
    projectId?: string;
  }): Promise<VercelDeployResult> {
    const requestId = `req-${Date.now()}`;
    const projectName = this.sanitizeProjectName(params.projectName);
    const domainUrl = params.customDomain
      ? this.ensureUrl(params.customDomain)
      : `https://${projectName}.${env().vercelDefaultDomain || 'vercel.app'}`;

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
      if (!repo) throw new Error(`Could not parse GitHub repo from ${params.repoUrl}`);

      // 1. Find or create the Vercel project, linked to the GitHub repo.
      const project = await this.findOrCreateProject(projectName, repo);
      const projectId = project.id ?? projectName;

      // 2. Create a production deployment from the repo's main branch.
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
      const deployment = (await deployRes.json()) as { id?: string; url?: string; readyState?: string };
      if (!deployment.id) throw new Error('Vercel deployment did not return an id');

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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`deploy error: ${message}`);
      return { ok: false, error: message, requestId };
    }
  }

  async status(deploymentUuid: string, appUuid: string): Promise<Record<string, unknown>> {
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
      const d = (await res.json()) as {
        id?: string;
        readyState?: string;
        state?: string;
        meta?: { githubCommitMessage?: string };
        ready?: number;
      };
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
    } catch (err) {
      this.logger.error(`status error: ${err instanceof Error ? err.message : String(err)}`);
      return { success: false, app: { uuid: appUuid }, latestDeployment: { uuid: deploymentUuid } };
    }
  }

  private async findOrCreateProject(
    name: string,
    repo: string,
  ): Promise<{ id?: string; name?: string }> {
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
      return (await createRes.json()) as { id?: string; name?: string };
    }
    // 409 = project already exists; fall through to a lookup.
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
    return (await getRes.json()) as { id?: string; name?: string };
  }

  private mapDeploymentStatus(readyState: string): string {
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

  private mapAppStatus(readyState: string): string {
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

  parseRepoFullName(repoUrl: string): string | null {
    try {
      if (repoUrl.startsWith('git@')) {
        const match = repoUrl.match(/git@[^:]+:(.+?)(?:\.git)?$/);
        return match?.[1] ?? null;
      }
      const url = new URL(repoUrl);
      const path = url.pathname.replace(/^\//, '').replace(/\.git$/, '').replace(/\/+$/, '');
      return path || null;
    } catch {
      return null;
    }
  }

  private deriveProjectName(domain: string): string {
    const first = domain.trim().split('.')[0] || domain;
    return first.replace(/^https?:\/\//, '');
  }

  private sanitizeProjectName(name: string): string {
    const lowered = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const trimmed = lowered.replace(/^-+|-+$/g, '').slice(0, 100);
    return trimmed || 'ai-website-app';
  }

  private ensureUrl(domain: string): string {
    const trimmed = domain.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  private url(path: string): string {
    const base = `${VERCEL_API}${path}`;
    const teamId = env().vercelTeamId;
    if (!teamId) return base;
    return `${base}${path.includes('?') ? '&' : '?'}teamId=${encodeURIComponent(teamId)}`;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env().vercelToken}`,
    };
  }
}
