"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentMcpToolService = void 0;
const common_1 = require("@nestjs/common");
const tools_1 = require("@langchain/core/tools");
const docs_mcp_server_service_1 = require("../../mcp/docs-mcp-server.service");
const shadcn_mcp_server_service_1 = require("../../mcp/shadcn-mcp-server.service");
let AgentMcpToolService = class AgentMcpToolService {
    constructor(docs, shadcn) {
        this.docs = docs;
        this.shadcn = shadcn;
    }
    getTools(context) {
        const sandbox = context?.sandboxProvider;
        const docsTools = [
            new tools_1.DynamicStructuredTool({
                name: 'docs_context7_resolve_library',
                description: 'Resolve a library name to a Context7-compatible library ID. Use this when you need docs for a library but do not know its Context7 ID.',
                schema: docs_mcp_server_service_1.resolveLibrarySchema,
                func: async (args) => {
                    const result = await this.docs.resolveLibrary(args);
                    return result.content.map((c) => c.text).join('\n');
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'docs_context7_query',
                description: 'Fetch up-to-date documentation for a Context7 library ID and a specific query. Use this for precise API references and code examples.',
                schema: docs_mcp_server_service_1.queryDocsSchema,
                func: async (args) => {
                    const result = await this.docs.queryDocs(args);
                    return result.content.map((c) => c.text).join('\n');
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'docs_framework',
                description: 'Fetch up-to-date documentation for a supported framework (react, vite, next, prisma, node, pocketbase, playwright). Use this when you need framework-specific API details.',
                schema: docs_mcp_server_service_1.frameworkDocsSchema,
                func: async (args) => {
                    const result = await this.docs.frameworkDocs(args);
                    return result.content.map((c) => c.text).join('\n');
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'docs_react',
                description: 'Fetch current React documentation for a specific API or pattern.',
                schema: (0, docs_mcp_server_service_1.singleFrameworkDocsSchema)('React'),
                func: async (args) => {
                    const result = await this.docs.reactDocs(args);
                    return result.content.map((c) => c.text).join('\n');
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'docs_vite',
                description: 'Fetch current Vite documentation for a specific API or configuration topic.',
                schema: (0, docs_mcp_server_service_1.singleFrameworkDocsSchema)('Vite'),
                func: async (args) => {
                    const result = await this.docs.viteDocs(args);
                    return result.content.map((c) => c.text).join('\n');
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'docs_node',
                description: 'Fetch current Node.js documentation for a specific API or topic.',
                schema: (0, docs_mcp_server_service_1.singleFrameworkDocsSchema)('Node.js'),
                func: async (args) => {
                    const result = await this.docs.nodeDocs(args);
                    return result.content.map((c) => c.text).join('\n');
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'docs_pocketbase',
                description: 'Fetch current PocketBase (JavaScript SDK) documentation for a specific API or topic.',
                schema: (0, docs_mcp_server_service_1.singleFrameworkDocsSchema)('PocketBase'),
                func: async (args) => {
                    const result = await this.docs.pocketbaseDocs(args);
                    return result.content.map((c) => c.text).join('\n');
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'docs_playwright',
                description: 'Fetch current Playwright documentation for a specific API or testing topic.',
                schema: (0, docs_mcp_server_service_1.singleFrameworkDocsSchema)('Playwright'),
                func: async (args) => {
                    const result = await this.docs.playwrightDocs(args);
                    return result.content.map((c) => c.text).join('\n');
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'docs_shadcn',
                description: 'Fetch current shadcn/ui documentation (components, theming, CLI). Use before writing or customizing shadcn components.',
                schema: (0, docs_mcp_server_service_1.singleFrameworkDocsSchema)('shadcn/ui'),
                func: async (args) => {
                    const result = await this.docs.shadcnDocs(args);
                    return result.content.map((c) => c.text).join('\n');
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'docs_tailwind',
                description: 'Fetch current Tailwind CSS documentation (utility classes, configuration, responsive design).',
                schema: (0, docs_mcp_server_service_1.singleFrameworkDocsSchema)('Tailwind CSS'),
                func: async (args) => {
                    const result = await this.docs.tailwindDocs(args);
                    return result.content.map((c) => c.text).join('\n');
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'docs_framer_motion',
                description: 'Fetch current Framer Motion documentation (variants, gestures, layout animations).',
                schema: (0, docs_mcp_server_service_1.singleFrameworkDocsSchema)('Framer Motion'),
                func: async (args) => {
                    const result = await this.docs.framerMotionDocs(args);
                    return result.content.map((c) => c.text).join('\n');
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'docs_zod',
                description: 'Fetch current Zod documentation (schemas, validation, type inference).',
                schema: (0, docs_mcp_server_service_1.singleFrameworkDocsSchema)('Zod'),
                func: async (args) => {
                    const result = await this.docs.zodDocs(args);
                    return result.content.map((c) => c.text).join('\n');
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'docs_react_hook_form',
                description: 'Fetch current React Hook Form documentation (register, controller, validation integration).',
                schema: (0, docs_mcp_server_service_1.singleFrameworkDocsSchema)('React Hook Form'),
                func: async (args) => {
                    const result = await this.docs.reactHookFormDocs(args);
                    return result.content.map((c) => c.text).join('\n');
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'docs_supabase_js',
                description: 'Fetch current Supabase JavaScript client documentation (auth, queries, realtime).',
                schema: (0, docs_mcp_server_service_1.singleFrameworkDocsSchema)('Supabase JS'),
                func: async (args) => {
                    const result = await this.docs.supabaseJsDocs(args);
                    return result.content.map((c) => c.text).join('\n');
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'docs_stripe',
                description: 'Fetch current Stripe.js documentation (elements, payment intents, checkout).',
                schema: (0, docs_mcp_server_service_1.singleFrameworkDocsSchema)('Stripe.js'),
                func: async (args) => {
                    const result = await this.docs.stripeDocs(args);
                    return result.content.map((c) => c.text).join('\n');
                },
            }),
        ];
        const shadcnTools = [
            new tools_1.DynamicStructuredTool({
                name: 'shadcn_search',
                description: 'Search the shadcn/ui component registry for components, blocks, hooks, or templates matching a query.',
                schema: shadcn_mcp_server_service_1.shadcnSearchSchema,
                func: async (args) => {
                    const result = await this.shadcn.searchRegistry(args);
                    return JSON.stringify(result, null, 2);
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'shadcn_view',
                description: 'View the full details of a shadcn/ui registry item (files, dependencies, registryDependencies).',
                schema: shadcn_mcp_server_service_1.shadcnViewSchema,
                func: async (args) => {
                    const result = await this.shadcn.viewItem(args);
                    return JSON.stringify(result, null, 2);
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'shadcn_install',
                description: 'Install a shadcn/ui registry item into the current project sandbox (e.g., "button"). Requires a live sandbox.',
                schema: shadcn_mcp_server_service_1.shadcnInstallSchema,
                func: async (args) => {
                    if (!sandbox) {
                        throw new Error('shadcn_install requires a sandbox context');
                    }
                    const result = await this.shadcn.installItem(sandbox.currentSandboxId, args.name);
                    return result;
                },
            }),
            new tools_1.DynamicStructuredTool({
                name: 'shadcn_init',
                description: 'Initialize shadcn/ui in the current project sandbox. Use before installing components if components.json is missing.',
                schema: shadcn_mcp_server_service_1.shadcnInitSchema,
                func: async (args) => {
                    if (!sandbox) {
                        throw new Error('shadcn_init requires a sandbox context');
                    }
                    const result = await this.shadcn.initShadcn(sandbox.currentSandboxId, args.baseColor);
                    return result;
                },
            }),
        ];
        return [...docsTools, ...shadcnTools];
    }
};
exports.AgentMcpToolService = AgentMcpToolService;
exports.AgentMcpToolService = AgentMcpToolService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [docs_mcp_server_service_1.DocsMcpServerService,
        shadcn_mcp_server_service_1.ShadcnMcpServerService])
], AgentMcpToolService);
//# sourceMappingURL=agent-mcp-tool.service.js.map