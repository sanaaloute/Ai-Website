import { TemplateCatalogService } from './template-catalog.service';
import { TemplateFetchService } from './template-fetch.service';
import { FetchTemplateDto } from './dto/fetch-template.dto';
export declare class TemplatesController {
    private readonly catalog;
    private readonly fetcher;
    private readonly logger;
    constructor(catalog: TemplateCatalogService, fetcher: TemplateFetchService);
    listCategories(): Promise<{
        success: boolean;
        categories: import("./template-catalog.service").CategoryCatalog[];
    }>;
    getCategory(category: string): Promise<{
        success: boolean;
        catalog: import("./template-catalog.service").CategoryCatalog;
    }>;
    getTemplate(category: string, template: string): Promise<{
        success: boolean;
        template: Record<string, unknown> | import("./template-catalog.service").TemplateMeta;
    }>;
    fetchTemplate(dto: FetchTemplateDto): Promise<{
        success: boolean;
        category: string;
        template: string;
        source: string;
        fileCount: number;
        files: Record<string, string>;
    }>;
}
