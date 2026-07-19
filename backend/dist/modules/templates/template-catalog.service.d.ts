export interface TemplateMeta {
    id: string;
    name: string;
    path: string;
    subcategory?: string;
    description?: string;
    tags?: string[];
    primaryColor?: string;
    framework?: string;
    styling?: string;
}
export interface CategoryCatalog {
    category: string;
    label: string;
    description?: string;
    framework?: string;
    styling?: string;
    templates: TemplateMeta[];
}
export declare class TemplateCatalogService {
    private readonly logger;
    private readonly templatesDir;
    constructor();
    get available(): boolean;
    get dir(): string | null;
    private resolveTemplatesDir;
    listCategories(): Promise<CategoryCatalog[]>;
    getCategory(category: string): Promise<CategoryCatalog | null>;
    findTemplate(category: string, template: string): Promise<TemplateMeta | null>;
    getTemplateMeta(category: string, templatePath: string): Promise<Record<string, unknown> | null>;
    getLocalTemplateFiles(category: string, templatePath: string): Promise<Record<string, string> | null>;
    private collectFiles;
}
