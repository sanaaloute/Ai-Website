import { Injectable, Logger } from '@nestjs/common';
import { env } from '@/config/env';
import {
  DeployParams,
  DeployProvider,
  DeployResult,
  DomainCheck,
} from './deploy.types';

/**
 * Coolify deployment provider (extension point).
 *
 * Coolify is a self-hosted PaaS that natively builds/runs BOTH single-container
 * (Next.js) and multi-container (Vite + PocketBase / docker-compose) sites with
 * volumes, domains and TLS. This project integrates with it over its HTTP API
 * (run Coolify as a sibling service in docker-compose.selfhost.yml and point the
 * backend at it).
 *
 * This runner is intentionally a thin, clearly-flagged stub: Coolify's API has
 * changed across versions and requires operator-supplied IDs (project/server/
 * environment UUIDs). Wire `COOLIFY_URL` + `COOLIFY_TOKEN` and implement the
 * calls below against your installed Coolify version's `/api/v1` to activate it.
 *
 * For a dependency-free same-server deploy of Next.js sites, prefer
 * DEPLOY_PROVIDER=docker (see DockerDeployRunner), which needs no Coolify.
 */
@Injectable()
export class CoolifyDeployRunner implements DeployProvider {
  readonly name = 'coolify' as const;
  private readonly logger = new Logger(CoolifyDeployRunner.name);

  get configured(): boolean {
    return !!env().coolifyUrl && !!env().coolifyToken;
  }

  async checkDomain(domain: string): Promise<DomainCheck> {
    if (!this.configured) {
      return { available: true, message: 'Coolify not configured; domain appears available', conflictProjectName: null };
    }
    // Implement against your Coolify version, e.g. GET /api/v1/applications and
    // match on `domains`/`fqdn`. Returning available=true keeps the flow moving.
    this.logger.debug(`coolify.checkDomain(${domain}) — implement against your Coolify API`);
    return { available: true, message: 'Coolify checkDomain not implemented', conflictProjectName: null };
  }

  async deploy(params: DeployParams): Promise<DeployResult> {
    const requestId = `coolify-${Date.now()}`;
    if (!this.configured) {
      return {
        ok: false,
        requestId,
        error:
          'Coolify deploy is not configured. Set COOLIFY_URL and COOLIFY_TOKEN, ' +
          'implement CoolifyDeployRunner against your Coolify /api/v1, or use DEPLOY_PROVIDER=docker.',
      };
    }

    // Sketch of the intended flow (adapt to your Coolify version):
    //  1. POST {base}/api/v1/applications { git_repository, git_branch: 'main',
    //     build_pack: 'dockerfile' (Next) or 'dockercompose' (Vite+PB),
    //     domains, project_uuid, server_uuid, environment_name, ports_exposes }.
    //  2. POST {base}/api/v1/applications/{uuid}/deploy  → returns deployment uuid.
    //  3. Inject runtime env (DATABASE_URL / JWT_SECRET) via the env API.
    this.logger.warn(
      `coolify.deploy(${params.projectName}) called but not implemented — ` +
        `would deploy ${params.repoUrl} via ${env().coolifyUrl}`,
    );
    return {
      ok: false,
      requestId,
      error:
        'CoolifyDeployRunner is an extension point and is not implemented yet. ' +
        'Implement it against your Coolify /api/v1 (see SELFHOST.md) or use DEPLOY_PROVIDER=docker.',
    };
  }

  async status(deploymentUuid: string, appUuid: string): Promise<Record<string, unknown>> {
    if (!this.configured) {
      return { success: false, app: { uuid: appUuid }, latestDeployment: { uuid: deploymentUuid } };
    }
    // Implement: GET {base}/api/v1/deployments/{deploymentUuid} and map readyState.
    return { success: false, app: { uuid: appUuid }, latestDeployment: { uuid: deploymentUuid } };
  }
}
