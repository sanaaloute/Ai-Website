export declare const MINIMAL_GENERIC_TEMPLATE: Record<string, string>;
export declare class TemplateService {
    private readonly logger;
    private readonly templatesDir;
    private readonly skipDirs;
    constructor();
    listCategories(): Record<string, string>;
    getTemplateKind(category: string): Promise<'next' | 'vite'>;
    getTemplateFiles(category: string): Promise<Record<string, string>>;
    getTemplateManifest(category: string): Promise<Record<string, unknown>>;
    getDbSchema(category: string): Promise<Record<string, unknown>>;
    getGenericTemplate(): Promise<Record<string, string>>;
    private resolveCategoryDir;
    private collectFiles;
    private injectSharedFiles;
}
