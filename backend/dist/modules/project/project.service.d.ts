import { StorageService } from "../../lib/storage.service";
export interface LovecodeDeploymentMetadata {
    platform?: string;
    githubRepoUrl?: string;
    vercelProjectId?: string;
    vercelDomainUrl?: string;
    vercelDeployedAt?: string;
    pocketbaseUrl?: string;
    pocketbaseAdminUrl?: string;
}
export interface LovecodeProjectMetadata {
    uuid?: string;
    name?: string;
    siteTitle?: string;
}
export interface UpsertLovecodeJsonOptions {
    project?: LovecodeProjectMetadata;
    deployment?: LovecodeDeploymentMetadata;
    snapshot?: Record<string, unknown>;
}
interface LovecodeJson {
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
    upsertLovecodeJson(userId: string, projectId: string, options?: UpsertLovecodeJsonOptions): Promise<{
        content: string;
        snapshot: Record<string, unknown>;
    } | null>;
    readLovecodeJson(userId: string, projectId: string): Promise<LovecodeJson | null>;
}
export {};
