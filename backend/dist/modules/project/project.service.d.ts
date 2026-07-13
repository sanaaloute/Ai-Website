import { StorageService } from "../../lib/storage.service";
export interface AiWebsiteDeploymentMetadata {
    platform?: string;
    githubRepoUrl?: string;
    vercelProjectId?: string;
    vercelDomainUrl?: string;
    vercelDeployedAt?: string;
    pocketbaseUrl?: string;
    pocketbaseAdminUrl?: string;
}
export interface AiWebsiteProjectMetadata {
    uuid?: string;
    name?: string;
    siteTitle?: string;
}
export interface UpsertAiWebsiteJsonOptions {
    project?: AiWebsiteProjectMetadata;
    deployment?: AiWebsiteDeploymentMetadata;
    snapshot?: Record<string, unknown>;
}
interface AiWebsiteJson {
    project: {
        uuid: string;
        name: string;
        siteTitle: string;
    };
    deployment: {
        platform: string;
        note?: string;
        githubRepoUrl?: string;
        vercelProjectId?: string;
        vercelDomainUrl?: string;
        vercelDeployedAt?: string;
        pocketbaseUrl?: string;
        pocketbaseAdminUrl?: string;
    };
}
export declare class ProjectService {
    private readonly storage;
    private readonly logger;
    constructor(storage: StorageService);
    upsertAiWebsiteJson(userId: string, projectId: string, options?: UpsertAiWebsiteJsonOptions): Promise<{
        content: string;
        snapshot: Record<string, unknown>;
    } | null>;
    readAiWebsiteJson(userId: string, projectId: string): Promise<AiWebsiteJson | null>;
}
export {};
