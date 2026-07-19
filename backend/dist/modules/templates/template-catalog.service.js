"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TemplateCatalogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateCatalogService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const env_1 = require("../../config/env");
const SKIP_DIRS = new Set([
    'node_modules',
    '.git',
    '.next',
    'dist',
    'out',
    '.agent_state',
    '.playwright-mcp',
]);
const METADATA_FILES = new Set(['template.json']);
const SAFE_SEGMENT = /^[a-zA-Z0-9_.-]+$/;
let TemplateCatalogService = TemplateCatalogService_1 = class TemplateCatalogService {
    constructor() {
        this.logger = new common_1.Logger(TemplateCatalogService_1.name);
        this.templatesDir = this.resolveTemplatesDir();
        if (this.templatesDir) {
            this.logger.log(`Templates catalog directory: ${this.templatesDir}`);
        }
        else {
            this.logger.warn('No local templates directory found — catalog endpoints will be empty and template fetch will require GitHub (TEMPLATE_REPO)');
        }
    }
    get available() {
        return this.templatesDir !== null;
    }
    get dir() {
        return this.templatesDir;
    }
    resolveTemplatesDir() {
        let override;
        try {
            override = (0, env_1.env)().templatesDir;
        }
        catch {
        }
        const candidates = [
            override,
            path.resolve(process.cwd(), '..', 'templates'),
            path.resolve(process.cwd(), 'templates'),
        ].filter((d) => !!d);
        for (const dir of candidates) {
            if ((0, fs_1.existsSync)(dir))
                return dir;
        }
        return null;
    }
    async listCategories() {
        if (!this.templatesDir)
            return [];
        let entries;
        try {
            entries = await fs_1.promises.readdir(this.templatesDir);
        }
        catch {
            return [];
        }
        const catalogs = [];
        for (const entry of entries) {
            const catalog = await this.getCategory(entry);
            if (catalog)
                catalogs.push(catalog);
        }
        return catalogs;
    }
    async getCategory(category) {
        if (!this.templatesDir || !SAFE_SEGMENT.test(category))
            return null;
        const indexPath = path.join(this.templatesDir, category, 'index.json');
        try {
            const raw = await fs_1.promises.readFile(indexPath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed.category !== 'string' || !Array.isArray(parsed.templates)) {
                return null;
            }
            return parsed;
        }
        catch {
            return null;
        }
    }
    async findTemplate(category, template) {
        const catalog = await this.getCategory(category);
        if (!catalog || !SAFE_SEGMENT.test(template))
            return null;
        return (catalog.templates.find((t) => t.path === template || t.id === template) ?? null);
    }
    async getTemplateMeta(category, templatePath) {
        if (!this.templatesDir || !SAFE_SEGMENT.test(category) || !SAFE_SEGMENT.test(templatePath)) {
            return null;
        }
        try {
            const raw = await fs_1.promises.readFile(path.join(this.templatesDir, category, templatePath, 'template.json'), 'utf-8');
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
    async getLocalTemplateFiles(category, templatePath) {
        if (!this.templatesDir || !SAFE_SEGMENT.test(category) || !SAFE_SEGMENT.test(templatePath)) {
            return null;
        }
        const dir = path.join(this.templatesDir, category, templatePath);
        if (!(0, fs_1.existsSync)(dir))
            return null;
        const files = {};
        await this.collectFiles(dir, dir, files);
        if (Object.keys(files).length === 0)
            return null;
        return files;
    }
    async collectFiles(dir, rootDir, out) {
        const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (SKIP_DIRS.has(entry.name))
                continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await this.collectFiles(fullPath, rootDir, out);
            }
            else if (entry.isFile()) {
                if (METADATA_FILES.has(entry.name))
                    continue;
                const relPath = path.relative(rootDir, fullPath).split(path.sep).join('/');
                try {
                    out[relPath] = await fs_1.promises.readFile(fullPath, 'utf-8');
                }
                catch {
                    this.logger.warn(`Skipping unreadable template file ${relPath}`);
                }
            }
        }
    }
};
exports.TemplateCatalogService = TemplateCatalogService;
exports.TemplateCatalogService = TemplateCatalogService = TemplateCatalogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TemplateCatalogService);
//# sourceMappingURL=template-catalog.service.js.map