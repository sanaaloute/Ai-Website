import { z } from 'zod';
export interface DocsToolResult {
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}
export declare class DocsMcpServerService {
    private readonly logger;
    private readonly cache;
    private get apiKey();
    private get cacheTtlMs();
    private buildHeaders;
    private getCache;
    private setCache;
    private fetchJson;
    private fetchText;
    resolveLibrary(args: {
        query: string;
        libraryName: string;
    }): Promise<DocsToolResult>;
    queryDocs(args: {
        libraryId: string;
        query: string;
        tokens?: number;
    }): Promise<DocsToolResult>;
    frameworkDocs(args: {
        framework: string;
        query: string;
        tokens?: number;
    }): Promise<DocsToolResult>;
    reactDocs(args: {
        query: string;
        tokens?: number;
    }): Promise<DocsToolResult>;
    viteDocs(args: {
        query: string;
        tokens?: number;
    }): Promise<DocsToolResult>;
    nodeDocs(args: {
        query: string;
        tokens?: number;
    }): Promise<DocsToolResult>;
    pocketbaseDocs(args: {
        query: string;
        tokens?: number;
    }): Promise<DocsToolResult>;
    playwrightDocs(args: {
        query: string;
        tokens?: number;
    }): Promise<DocsToolResult>;
    shortcutDocs(key: string, args: {
        query: string;
        tokens?: number;
    }): Promise<DocsToolResult>;
    shadcnDocs(args: {
        query: string;
        tokens?: number;
    }): Promise<DocsToolResult>;
    tailwindDocs(args: {
        query: string;
        tokens?: number;
    }): Promise<DocsToolResult>;
    framerMotionDocs(args: {
        query: string;
        tokens?: number;
    }): Promise<DocsToolResult>;
    zodDocs(args: {
        query: string;
        tokens?: number;
    }): Promise<DocsToolResult>;
    reactHookFormDocs(args: {
        query: string;
        tokens?: number;
    }): Promise<DocsToolResult>;
    supabaseJsDocs(args: {
        query: string;
        tokens?: number;
    }): Promise<DocsToolResult>;
    stripeDocs(args: {
        query: string;
        tokens?: number;
    }): Promise<DocsToolResult>;
}
export declare const resolveLibrarySchema: z.ZodObject<{
    query: z.ZodString;
    libraryName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    query: string;
    libraryName: string;
}, {
    query: string;
    libraryName: string;
}>;
export declare const queryDocsSchema: z.ZodObject<{
    libraryId: z.ZodString;
    query: z.ZodString;
    tokens: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    query: string;
    libraryId: string;
    tokens?: number | undefined;
}, {
    query: string;
    libraryId: string;
    tokens?: number | undefined;
}>;
export declare const frameworkDocsSchema: z.ZodObject<{
    framework: z.ZodEnum<["react", "vite", "node", "nodejs", "pocketbase", "playwright"]>;
    query: z.ZodString;
    tokens: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    query: string;
    framework: "react" | "pocketbase" | "node" | "vite" | "nodejs" | "playwright";
    tokens?: number | undefined;
}, {
    query: string;
    framework: "react" | "pocketbase" | "node" | "vite" | "nodejs" | "playwright";
    tokens?: number | undefined;
}>;
export declare const singleFrameworkDocsSchema: (framework: string) => z.ZodObject<{
    query: z.ZodString;
    tokens: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    query: string;
    tokens?: number | undefined;
}, {
    query: string;
    tokens?: number | undefined;
}>;
