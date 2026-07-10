export type DeployProviderName = 'vercel' | 'docker' | 'coolify';
export interface DeployParams {
    repoUrl: string;
    projectName: string;
    customDomain?: string;
    projectId?: string;
    env?: Record<string, string>;
    framework?: 'next' | 'vite';
}
export interface DeployResult {
    ok: boolean;
    appUuid?: string;
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
