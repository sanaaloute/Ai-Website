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
var PocketbaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PocketbaseService = exports.DEFAULT_POCKETBASE_ADMIN_PASSWORD = exports.DEFAULT_POCKETBASE_ADMIN_EMAIL = void 0;
exports.generateSandboxPocketbaseCredentials = generateSandboxPocketbaseCredentials;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path = __importStar(require("path"));
exports.DEFAULT_POCKETBASE_ADMIN_EMAIL = 'admin@lovecode.com';
exports.DEFAULT_POCKETBASE_ADMIN_PASSWORD = 'admin@lovecode';
let PocketbaseService = PocketbaseService_1 = class PocketbaseService {
    constructor() {
        this.logger = new common_1.Logger(PocketbaseService_1.name);
    }
    async resolveTemplateDir(category = 'ecommerce') {
        const fromSource = path.resolve(process.cwd(), 'src', 'templates', category);
        const fromDist = path.resolve(process.cwd(), 'dist', 'templates', category);
        return (await this.directoryExists(fromDist)) ? fromDist : fromSource;
    }
    async directoryExists(dir) {
        try {
            const stat = await fs_1.promises.stat(dir);
            return stat.isDirectory();
        }
        catch {
            return false;
        }
    }
    async getTemplateFiles(category = 'ecommerce') {
        const templateDir = await this.resolveTemplateDir(category);
        const files = [];
        await this.collectFiles(templateDir, templateDir, files);
        return files.filter((file) => this.isDeploymentFile(file.path));
    }
    isDeploymentFile(relPath) {
        const normalized = relPath.replace(/\\/g, '/');
        return (normalized === 'Dockerfile' ||
            normalized === 'docker-compose.yaml' ||
            normalized === 'docker-compose.yml' ||
            normalized === 'nginx.conf' ||
            normalized.startsWith('pocketbase/'));
    }
    async renderDeploymentFiles(options) {
        const { projectName, domain, category = 'ecommerce' } = options;
        const pbPrefix = options.pbSubdomainPrefix || 'pb';
        const pbDomain = `${pbPrefix}.${domain}`;
        const adminEmail = options.adminEmail || exports.DEFAULT_POCKETBASE_ADMIN_EMAIL;
        const adminPassword = options.adminPassword || exports.DEFAULT_POCKETBASE_ADMIN_PASSWORD;
        const templateFiles = await this.getTemplateFiles(category);
        const renderedFiles = templateFiles.map((file) => ({
            path: file.path,
            content: this.substitute(file.content, {
                PROJECT_NAME: projectName,
                DOMAIN: domain,
                PB_ADMIN_EMAIL: adminEmail,
                PB_ADMIN_PASSWORD: adminPassword,
                PB_URL: '/api',
                PB_DOMAIN: pbDomain,
                FRONTEND_URL: `https://${domain}`,
                ADMIN_URL: `https://${pbDomain}/_/`,
            }),
        }));
        return {
            files: renderedFiles,
            adminEmail,
            adminPassword,
            frontendUrl: `https://${domain}`,
            pocketbaseUrl: `https://${pbDomain}`,
            adminUrl: `https://${pbDomain}/_/`,
        };
    }
    async getSchemaDescription(category = 'ecommerce') {
        const fromDist = path.resolve(process.cwd(), 'dist', 'templates', category, 'db_schema.json');
        const fromSource = path.resolve(process.cwd(), 'src', 'templates', category, 'db_schema.json');
        const schemaPath = (await this.fileExists(fromDist)) ? fromDist : fromSource;
        try {
            const content = await fs_1.promises.readFile(schemaPath, 'utf-8');
            return JSON.parse(content);
        }
        catch (err) {
            this.logger.warn(`Could not read schema for category ${category}: ${err instanceof Error ? err.message : String(err)}`);
            return {};
        }
    }
    async getFrontendSdkSource(category = 'ecommerce') {
        const fromDist = path.resolve(process.cwd(), 'dist', 'templates', category, 'src', 'lib', 'pocketbase.ts');
        const fromSource = path.resolve(process.cwd(), 'src', 'templates', category, 'src', 'lib', 'pocketbase.ts');
        const sdkPath = (await this.fileExists(fromDist)) ? fromDist : fromSource;
        try {
            return await fs_1.promises.readFile(sdkPath, 'utf-8');
        }
        catch (err) {
            this.logger.warn(`Could not read frontend SDK at ${sdkPath}: ${err instanceof Error ? err.message : String(err)}`);
            return '';
        }
    }
    async fileExists(file) {
        try {
            const stat = await fs_1.promises.stat(file);
            return stat.isFile();
        }
        catch {
            return false;
        }
    }
    substitute(content, vars) {
        return content.replace(/\{\{(\w+)\}\}/g, (_match, key) => vars[key] ?? `{{${key}}}`);
    }
    async collectFiles(dir, rootDir, out) {
        const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await this.collectFiles(fullPath, rootDir, out);
            }
            else if (entry.isFile()) {
                const relPath = path.relative(rootDir, fullPath);
                try {
                    const content = await fs_1.promises.readFile(fullPath, 'utf-8');
                    out.push({ path: relPath, content });
                }
                catch (err) {
                    this.logger.warn(`Skipping unreadable template file ${relPath}`);
                }
            }
        }
    }
};
exports.PocketbaseService = PocketbaseService;
exports.PocketbaseService = PocketbaseService = PocketbaseService_1 = __decorate([
    (0, common_1.Injectable)()
], PocketbaseService);
function generateSandboxPocketbaseCredentials() {
    return {
        adminEmail: exports.DEFAULT_POCKETBASE_ADMIN_EMAIL,
        adminPassword: exports.DEFAULT_POCKETBASE_ADMIN_PASSWORD,
    };
}
//# sourceMappingURL=pocketbase.service.js.map