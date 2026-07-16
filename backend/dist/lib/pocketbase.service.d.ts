export interface PocketBaseTemplateFile {
    path: string;
    content: string;
}
export interface PocketBaseDeploymentFiles {
    files: PocketBaseTemplateFile[];
    adminEmail: string;
    adminPassword: string;
    frontendUrl: string;
    pocketbaseUrl: string;
    adminUrl: string;
}
export declare const DEFAULT_POCKETBASE_ADMIN_EMAIL = "admin@ai-web-builder.com";
export declare const DEFAULT_POCKETBASE_ADMIN_PASSWORD = "admin@aiwebsite";
export interface RenderDeploymentOptions {
    projectName: string;
    domain: string;
    pbSubdomainPrefix?: string;
    adminEmail?: string;
    adminPassword?: string;
}
export declare class PocketbaseService {
    private readonly logger;
    private resolveTemplateDir;
    private directoryExists;
    getTemplateFiles(category?: string): Promise<PocketBaseTemplateFile[]>;
    private isDeploymentFile;
    renderDeploymentFiles(options: RenderDeploymentOptions & {
        category?: string;
    }): Promise<PocketBaseDeploymentFiles>;
    getSchemaDescription(category?: string): Promise<Record<string, unknown>>;
    getFrontendSdkSource(category?: string): Promise<string>;
    private fileExists;
    private substitute;
    private collectFiles;
}
export declare function generateSandboxPocketbaseCredentials(): {
    adminEmail: string;
    adminPassword: string;
};
