"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DocsMcpServerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.singleFrameworkDocsSchema = exports.frameworkDocsSchema = exports.queryDocsSchema = exports.resolveLibrarySchema = exports.DocsMcpServerService = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const env_1 = require("../../config/env");
const FRAMEWORK_LIBRARY_IDS = {
    react: '/react/react',
    vite: '/vitejs/vite',
    next: '/vercel/next.js',
    nextjs: '/vercel/next.js',
    prisma: '/prisma/prisma',
    node: '/nodejs/node',
    nodejs: '/nodejs/node',
    pocketbase: '/pocketbase/pocketbase',
    playwright: '/microsoft/playwright',
};
const SHORTCUT_LIBRARY_IDS = {
    shadcn: '/shadcn-ui/ui',
    tailwind: '/tailwindlabs/tailwindcss.com',
    framer_motion: '/grx7/framer-motion',
    zod: '/colinhacks/zod',
    react_hook_form: '/react-hook-form/react-hook-form',
    supabase_js: '/supabase/supabase-js',
    stripe: '/stripe/stripe-js',
};
function extractRedirectUrl(err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('library_redirected'))
        return null;
    const jsonStart = message.indexOf('{');
    if (jsonStart < 0)
        return null;
    try {
        const body = JSON.parse(message.slice(jsonStart));
        return typeof body.redirectUrl === 'string' && body.redirectUrl.length > 0
            ? body.redirectUrl
            : null;
    }
    catch {
        return null;
    }
}
let DocsMcpServerService = DocsMcpServerService_1 = class DocsMcpServerService {
    constructor() {
        this.logger = new common_1.Logger(DocsMcpServerService_1.name);
        this.cache = new Map();
    }
    get apiKey() {
        return (0, env_1.env)().context7ApiKey;
    }
    get cacheTtlMs() {
        return Math.max(0, (0, env_1.env)().mcpDocsCacheTtlSeconds) * 1000;
    }
    buildHeaders() {
        const headers = {};
        if (this.apiKey) {
            headers.Authorization = `Bearer ${this.apiKey}`;
        }
        return headers;
    }
    getCache(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }
    setCache(key, value) {
        if (this.cacheTtlMs <= 0)
            return;
        this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });
    }
    async fetchJson(url) {
        const res = await fetch(url, { headers: this.buildHeaders() });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Context7 request failed (${res.status}): ${body}`);
        }
        return res.json();
    }
    async fetchText(url) {
        const res = await fetch(url, { headers: this.buildHeaders() });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Context7 request failed (${res.status}): ${body}`);
        }
        return res.text();
    }
    async resolveLibrary(args) {
        try {
            const cacheKey = `resolve:${args.libraryName}:${args.query}`;
            const cached = this.getCache(cacheKey);
            if (cached) {
                return { content: [{ type: 'text', text: cached }] };
            }
            const url = `https://api.context7.com/v1/resolve?query=${encodeURIComponent(args.query)}&libraryName=${encodeURIComponent(args.libraryName)}&limit=10`;
            const data = await this.fetchJson(url);
            const text = JSON.stringify(data, null, 2);
            this.setCache(cacheKey, text);
            return { content: [{ type: 'text', text }] };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`resolveLibrary failed: ${message}`);
            return { content: [{ type: 'text', text: `Error resolving library: ${message}` }], isError: true };
        }
    }
    async queryDocs(args) {
        try {
            const tokens = args.tokens ?? 3000;
            const cacheKey = `docs:${args.libraryId}:${args.query}:${tokens}`;
            const cached = this.getCache(cacheKey);
            if (cached) {
                return { content: [{ type: 'text', text: cached }] };
            }
            let libraryId = args.libraryId;
            let text;
            let lastError;
            for (let attempt = 0; attempt < 2; attempt++) {
                const normalizedId = libraryId.replace(/^\//, '');
                const v1Url = `https://context7.com/api/v1/${normalizedId}?tokens=${tokens}&topic=${encodeURIComponent(args.query)}`;
                try {
                    try {
                        text = await this.fetchText(v1Url);
                    }
                    catch (v1Err) {
                        const v2Url = `https://context7.com/api/v2/context?libraryId=${encodeURIComponent(libraryId)}&query=${encodeURIComponent(args.query)}&tokens=${tokens}`;
                        text = await this.fetchText(v2Url);
                    }
                    break;
                }
                catch (err) {
                    lastError = err;
                    const redirectUrl = extractRedirectUrl(err);
                    if (redirectUrl && attempt === 0) {
                        this.logger.log(`Context7 library ${libraryId} redirected to ${redirectUrl}; retrying`);
                        libraryId = redirectUrl;
                        continue;
                    }
                    throw err;
                }
            }
            if (text === undefined) {
                throw lastError instanceof Error ? lastError : new Error(String(lastError));
            }
            this.setCache(cacheKey, text);
            return { content: [{ type: 'text', text }] };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`queryDocs failed: ${message}`);
            return { content: [{ type: 'text', text: `Error querying docs: ${message}` }], isError: true };
        }
    }
    async frameworkDocs(args) {
        const libraryId = FRAMEWORK_LIBRARY_IDS[args.framework.toLowerCase()];
        if (!libraryId) {
            return {
                content: [{ type: 'text', text: `Unknown framework "${args.framework}". Use context7_query_docs with a libraryId, or one of: ${Object.keys(FRAMEWORK_LIBRARY_IDS).join(', ')}.` }],
                isError: true,
            };
        }
        return this.queryDocs({ libraryId, query: args.query, tokens: args.tokens });
    }
    async reactDocs(args) {
        return this.frameworkDocs({ framework: 'react', query: args.query, tokens: args.tokens });
    }
    async viteDocs(args) {
        return this.frameworkDocs({ framework: 'vite', query: args.query, tokens: args.tokens });
    }
    async nodeDocs(args) {
        return this.frameworkDocs({ framework: 'node', query: args.query, tokens: args.tokens });
    }
    async pocketbaseDocs(args) {
        return this.frameworkDocs({ framework: 'pocketbase', query: args.query, tokens: args.tokens });
    }
    async playwrightDocs(args) {
        return this.frameworkDocs({ framework: 'playwright', query: args.query, tokens: args.tokens });
    }
    async shortcutDocs(key, args) {
        const libraryId = SHORTCUT_LIBRARY_IDS[key];
        if (!libraryId) {
            return {
                content: [{ type: 'text', text: `Unknown docs shortcut "${key}".` }],
                isError: true,
            };
        }
        return this.queryDocs({ libraryId, query: args.query, tokens: args.tokens });
    }
    async shadcnDocs(args) {
        return this.shortcutDocs('shadcn', args);
    }
    async tailwindDocs(args) {
        return this.shortcutDocs('tailwind', args);
    }
    async framerMotionDocs(args) {
        return this.shortcutDocs('framer_motion', args);
    }
    async zodDocs(args) {
        return this.shortcutDocs('zod', args);
    }
    async reactHookFormDocs(args) {
        return this.shortcutDocs('react_hook_form', args);
    }
    async supabaseJsDocs(args) {
        return this.shortcutDocs('supabase_js', args);
    }
    async stripeDocs(args) {
        return this.shortcutDocs('stripe', args);
    }
};
exports.DocsMcpServerService = DocsMcpServerService;
exports.DocsMcpServerService = DocsMcpServerService = DocsMcpServerService_1 = __decorate([
    (0, common_1.Injectable)()
], DocsMcpServerService);
exports.resolveLibrarySchema = zod_1.z.object({
    query: zod_1.z.string().describe('The user task or question, used to rank library matches.'),
    libraryName: zod_1.z.string().describe('The library name to resolve, e.g. "React" or "PocketBase".'),
});
exports.queryDocsSchema = zod_1.z.object({
    libraryId: zod_1.z.string().describe('A Context7-compatible library ID, e.g. /facebook/react.'),
    query: zod_1.z.string().describe('The specific API or topic to look up.'),
    tokens: zod_1.z.number().optional().describe('Maximum tokens of documentation to retrieve (default 3000).'),
});
exports.frameworkDocsSchema = zod_1.z.object({
    framework: zod_1.z.enum(['react', 'vite', 'next', 'nextjs', 'prisma', 'node', 'nodejs', 'pocketbase', 'playwright']).describe('Framework shorthand.'),
    query: zod_1.z.string().describe('The specific API or topic to look up.'),
    tokens: zod_1.z.number().optional().describe('Maximum tokens of documentation to retrieve (default 3000).'),
});
const singleFrameworkDocsSchema = (framework) => zod_1.z.object({
    query: zod_1.z.string().describe(`The specific ${framework} API or topic to look up.`),
    tokens: zod_1.z.number().optional().describe('Maximum tokens of documentation to retrieve (default 3000).'),
});
exports.singleFrameworkDocsSchema = singleFrameworkDocsSchema;
//# sourceMappingURL=docs-mcp-server.service.js.map