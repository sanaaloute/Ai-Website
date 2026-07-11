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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var McpController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpController = void 0;
const common_1 = require("@nestjs/common");
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const sse_js_1 = require("@modelcontextprotocol/sdk/server/sse.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const docs_mcp_server_service_1 = require("./docs-mcp-server.service");
let McpController = McpController_1 = class McpController {
    constructor(docsService) {
        this.docsService = docsService;
        this.logger = new common_1.Logger(McpController_1.name);
        this.transports = new Map();
    }
    createServer() {
        const server = new index_js_1.Server({ name: 'lovecode-docs', version: '1.0.0' }, { capabilities: { tools: {} } });
        server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'context7_resolve_library',
                    description: 'Resolve a library name to a Context7-compatible library ID.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'The user task or question, used to rank library matches.' },
                            libraryName: { type: 'string', description: 'The library name to resolve, e.g. "React" or "PocketBase".' },
                        },
                        required: ['query', 'libraryName'],
                    },
                },
                {
                    name: 'context7_query_docs',
                    description: 'Fetch up-to-date documentation for a Context7 library ID and a specific query.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            libraryId: { type: 'string', description: 'A Context7-compatible library ID, e.g. /facebook/react.' },
                            query: { type: 'string', description: 'The specific API or topic to look up.' },
                            tokens: { type: 'number', description: 'Maximum tokens of documentation to retrieve (default 3000).' },
                        },
                        required: ['libraryId', 'query'],
                    },
                },
                {
                    name: 'framework_docs',
                    description: 'Fetch up-to-date documentation for a supported framework (react, vite, next, prisma, node, pocketbase, playwright).',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            framework: {
                                type: 'string',
                                enum: ['react', 'vite', 'next', 'nextjs', 'prisma', 'node', 'nodejs', 'pocketbase', 'playwright'],
                                description: 'Framework shorthand.',
                            },
                            query: { type: 'string', description: 'The specific API or topic to look up.' },
                            tokens: { type: 'number', description: 'Maximum tokens of documentation to retrieve (default 3000).' },
                        },
                        required: ['framework', 'query'],
                    },
                },
            ],
        }));
        server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                let result;
                switch (name) {
                    case 'context7_resolve_library':
                        result = await this.docsService.resolveLibrary(args);
                        break;
                    case 'context7_query_docs':
                        result = await this.docsService.queryDocs(args);
                        break;
                    case 'framework_docs':
                        result = await this.docsService.frameworkDocs(args);
                        break;
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
                return { content: result.content };
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
            }
        });
        return server;
    }
    async sse(req, res) {
        const server = this.createServer();
        const transport = new sse_js_1.SSEServerTransport('/api/mcp/docs/messages', res);
        this.transports.set(transport.sessionId, transport);
        transport.onclose = () => {
            this.transports.delete(transport.sessionId);
        };
        try {
            await transport.start();
            await server.connect(transport);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`MCP SSE connection failed: ${message}`);
            if (!res.writableEnded) {
                res.status(500).end();
            }
        }
    }
    async messages(req, res, sessionId) {
        const transport = this.transports.get(sessionId);
        if (!transport) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        try {
            await transport.handlePostMessage(req, res, req.body);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`MCP message handling failed: ${message}`);
            if (!res.writableEnded) {
                res.status(500).json({ error: message });
            }
        }
    }
};
exports.McpController = McpController;
__decorate([
    (0, common_1.Get)('sse'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], McpController.prototype, "sse", null);
__decorate([
    (0, common_1.Post)('messages'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], McpController.prototype, "messages", null);
exports.McpController = McpController = McpController_1 = __decorate([
    (0, common_1.Controller)('api/mcp/docs'),
    __metadata("design:paramtypes", [docs_mcp_server_service_1.DocsMcpServerService])
], McpController);
//# sourceMappingURL=mcp.controller.js.map