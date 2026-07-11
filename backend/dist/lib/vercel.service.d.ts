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
export declare class VercelService {
    private readonly logger;
    get configured(): boolean;
    checkDomain(domain: string): Promise<{
        available: boolean;
        message: string;
        conflictProjectName: string | null;
    }>;
    deploy(params: {
        repoUrl: string;
        projectName: string;
        customDomain?: string;
        projectId?: string;
    }): Promise<VercelDeployResult>;
    status(deploymentUuid: string, appUuid: string): Promise<Record<string, unknown>>;
    private findOrCreateProject;
    private mapDeploymentStatus;
    private mapAppStatus;
    parseRepoFullName(repoUrl: string): string | null;
    private deriveProjectName;
    private sanitizeProjectName;
    private ensureUrl;
    private url;
    private headers;
}
