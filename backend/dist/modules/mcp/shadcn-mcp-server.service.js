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
var ShadcnMcpServerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadcnMcpServerService = exports.shadcnInitSchema = exports.shadcnInstallSchema = exports.shadcnViewSchema = exports.shadcnSearchSchema = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const e2b_service_1 = require("../../lib/e2b.service");
exports.shadcnSearchSchema = zod_1.z.object({
    query: zod_1.z.string().describe('Search term for shadcn/ui registry items (component, block, hook, etc.).'),
    limit: zod_1.z.number().optional().describe('Maximum number of results to return (default 10).'),
});
exports.shadcnViewSchema = zod_1.z.object({
    name: zod_1.z.string().describe('Exact registry item name, e.g. "button" or "login-form".'),
});
exports.shadcnInstallSchema = zod_1.z.object({
    name: zod_1.z.string().describe('Exact registry item name to install, e.g. "button".'),
});
exports.shadcnInitSchema = zod_1.z.object({
    baseColor: zod_1.z.enum(['slate', 'gray', 'zinc', 'neutral', 'stone']).optional().describe('Base color for the shadcn/ui theme (default slate).'),
});
let ShadcnMcpServerService = ShadcnMcpServerService_1 = class ShadcnMcpServerService {
    constructor(e2b) {
        this.e2b = e2b;
        this.logger = new common_1.Logger(ShadcnMcpServerService_1.name);
        this.baseUrl = 'https://ui.shadcn.com/r';
        this.registryStyle = 'new-york';
        this.cacheTtlMs = 5 * 60 * 1000;
        this.registryCache = null;
    }
    async fetchJson(url) {
        const res = await fetch(url);
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Shadcn registry request failed (${res.status}): ${body}`);
        }
        return res.json();
    }
    async getRegistry() {
        if (this.registryCache && Date.now() < this.registryCache.expiresAt) {
            return this.registryCache.data;
        }
        const items = await this.fetchJson(`${this.baseUrl}/index.json`);
        const data = { name: 'shadcn/ui', homepage: 'https://ui.shadcn.com', items };
        this.registryCache = { data, expiresAt: Date.now() + this.cacheTtlMs };
        return data;
    }
    async searchRegistry(args) {
        try {
            const registry = await this.getRegistry();
            const query = args.query.toLowerCase();
            const limit = args.limit ?? 10;
            const items = registry.items
                .filter((item) => item.name.toLowerCase().includes(query) ||
                (item.title?.toLowerCase().includes(query) ?? false) ||
                (item.description?.toLowerCase().includes(query) ?? false))
                .slice(0, limit);
            return { items };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`searchRegistry failed: ${message}`);
            throw new Error(`Shadcn search failed: ${message}`);
        }
    }
    async viewItem(args) {
        try {
            return await this.fetchJson(`${this.baseUrl}/styles/${this.registryStyle}/${args.name}.json`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`viewItem failed for ${args.name}: ${message}`);
            throw new Error(`Shadcn view failed: ${message}`);
        }
    }
    async installItem(sandboxId, name) {
        const res = await this.e2b.runCommand(sandboxId, `npx shadcn@latest add -y -o ${name}`, '/home/user/app', { timeoutMs: 5 * 60 * 1000 });
        if (res.exitCode !== 0) {
            throw new Error(`shadcn add failed: ${res.error || res.output}`);
        }
        return res.output;
    }
    async initShadcn(sandboxId, baseColor = 'slate') {
        const res = await this.e2b.runCommand(sandboxId, `npx shadcn@latest init -y -d --base-color ${baseColor}`, '/home/user/app', { timeoutMs: 5 * 60 * 1000 });
        if (res.exitCode !== 0) {
            throw new Error(`shadcn init failed: ${res.error || res.output}`);
        }
        return res.output;
    }
};
exports.ShadcnMcpServerService = ShadcnMcpServerService;
exports.ShadcnMcpServerService = ShadcnMcpServerService = ShadcnMcpServerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [e2b_service_1.E2BService])
], ShadcnMcpServerService);
//# sourceMappingURL=shadcn-mcp-server.service.js.map