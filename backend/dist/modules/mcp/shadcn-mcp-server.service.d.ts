import { z } from 'zod';
import { E2BService } from "../../lib/e2b.service";
export interface ShadcnRegistryItem {
    name: string;
    type: string;
    title?: string;
    description?: string;
    dependencies?: string[];
    devDependencies?: string[];
    registryDependencies?: string[];
    files?: Array<{
        path: string;
        type: string;
        content?: string;
    }>;
}
export interface ShadcnRegistry {
    name: string;
    homepage: string;
    items: ShadcnRegistryItem[];
}
export interface ShadcnSearchResult {
    items: ShadcnRegistryItem[];
}
export declare const shadcnSearchSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit?: number | undefined;
}, {
    query: string;
    limit?: number | undefined;
}>;
export declare const shadcnViewSchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const shadcnInstallSchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const shadcnInitSchema: z.ZodObject<{
    baseColor: z.ZodOptional<z.ZodEnum<["slate", "gray", "zinc", "neutral", "stone"]>>;
}, "strip", z.ZodTypeAny, {
    baseColor?: "slate" | "gray" | "zinc" | "neutral" | "stone" | undefined;
}, {
    baseColor?: "slate" | "gray" | "zinc" | "neutral" | "stone" | undefined;
}>;
export declare class ShadcnMcpServerService {
    private readonly e2b;
    private readonly logger;
    private readonly baseUrl;
    private readonly registryStyle;
    private readonly cacheTtlMs;
    private registryCache;
    constructor(e2b: E2BService);
    private fetchJson;
    private getRegistry;
    searchRegistry(args: {
        query: string;
        limit?: number;
    }): Promise<ShadcnSearchResult>;
    viewItem(args: {
        name: string;
    }): Promise<ShadcnRegistryItem>;
    installItem(sandboxId: string, name: string): Promise<string>;
    initShadcn(sandboxId: string, baseColor?: string): Promise<string>;
}
