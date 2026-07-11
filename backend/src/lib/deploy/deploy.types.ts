export type DeployProviderName = 'vercel' | 'docker' | 'coolify';

export interface DeployParams {
  /** Git repository URL to build from (produced by the GitHub push step). */
  repoUrl: string;
  /** Human project name; sanitized into the site slug. */
  projectName: string;
  customDomain?: string;
  /** Existing app/site id — when present, this is an update (redeploy). */
  projectId?: string;
  /** Runtime environment variables injected into the site container. */
  env?: Record<string, string>;
  /** Template framework; the docker runner auto-detects when omitted. */
  framework?: 'next' | 'vite';
}

export interface DeployResult {
  ok: boolean;
  /** Provider-specific app id (Vercel project id / container name / Coolify app uuid). */
  appUuid?: string;
  /** Provider-specific deployment id (image tag / deployment uuid). */
  deploymentUuid?: string;
  domainUrl?: string;
  projectUrl?: string;
  isUpdate?: boolean;
  requestId?: string;
  error?: string;
}

export interface DomainCheck {
  available: boolean;
  message: string;
  conflictProjectName: string | null;
}

export interface DeployProvider {
  readonly name: DeployProviderName;
  readonly configured: boolean;
  deploy(params: DeployParams): Promise<DeployResult>;
  status(deploymentUuid: string, appUuid: string): Promise<Record<string, unknown>>;
  checkDomain(domain: string): Promise<DomainCheck>;
}
