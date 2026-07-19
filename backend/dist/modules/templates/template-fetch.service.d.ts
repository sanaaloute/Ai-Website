export interface FetchTemplateOptions {
    owner: string;
    repo: string;
    ref?: string;
    templatePath: string;
    token?: string;
}
export declare function extractTemplateFromZip(buffer: Buffer, templatePath: string): Promise<Record<string, string>>;
export declare class TemplateFetchService {
    private readonly logger;
    get configured(): boolean;
    fetchTemplate(templatePath: string): Promise<Record<string, string>>;
    fetchTemplateFiles(opts: FetchTemplateOptions): Promise<Record<string, string>>;
}
