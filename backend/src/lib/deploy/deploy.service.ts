import { Injectable } from '@nestjs/common';
import { env } from '@/config/env';
import { VercelService } from '@/lib/vercel.service';
import { DockerDeployRunner } from './docker.runner';
import { CoolifyDeployRunner } from './coolify.runner';
import {
  DeployParams,
  DeployProvider,
  DeployProviderName,
  DeployResult,
  DomainCheck,
} from './deploy.types';

/**
 * Single entry point for deploying a generated site. Selects the concrete
 * provider from DEPLOY_PROVIDER:
 *   - 'vercel'  → managed Vercel (existing flow)
 *   - 'docker'  → self-hosted, same-server Docker + Traefik (Next.js sites)
 *   - 'coolify' → self-hosted Coolify (Next.js or Vite+PocketBase) [extension point]
 *
 * The surface mirrors VercelService (checkDomain/deploy/status) so callers can
 * swap to this facade without changes.
 */
@Injectable()
export class DeployService {
  constructor(
    private readonly vercel: VercelService,
    private readonly docker: DockerDeployRunner,
    private readonly coolify: CoolifyDeployRunner,
  ) {}

  get activeProvider(): DeployProviderName {
    return env().deployProvider;
  }

  get configured(): boolean {
    return this.provider().configured;
  }

  async checkDomain(domain: string): Promise<DomainCheck> {
    return this.provider().checkDomain(domain);
  }

  async deploy(params: DeployParams): Promise<DeployResult> {
    return this.provider().deploy(params);
  }

  async status(deploymentUuid: string, appUuid: string): Promise<Record<string, unknown>> {
    return this.provider().status(deploymentUuid, appUuid);
  }

  private provider(): DeployProvider {
    switch (env().deployProvider) {
      case 'docker':
        return this.docker;
      case 'coolify':
        return this.coolify;
      case 'vercel':
      default:
        // VercelService exposes the same methods; it just lacks the `name`
        // discriminator, so we adapt it structurally.
        return this.vercel as unknown as DeployProvider;
    }
  }
}
