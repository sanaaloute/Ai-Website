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
var TemplateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateService = exports.MINIMAL_GENERIC_TEMPLATE = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const TEMPLATE_CATEGORIES = {
    ecommerce: 'E-commerce store with product listings, cart, and checkout',
    education: 'Online course platform with lessons and progress tracking',
    saas: 'SaaS landing page with pricing, features, and testimonials',
    portfolio: 'Creative portfolio with projects gallery and contact',
    blog: 'Content blog with articles, categories, and search',
    restaurant: 'Restaurant website with menu, reservations, and gallery',
    real_estate: 'Real estate listings with property search and filters',
    health: 'Health & wellness platform with appointments and resources',
    travel: 'Travel agency with destinations, bookings, and itineraries',
    job_portal: 'Job board with listings, applications, and profiles',
    fashion: 'Fashion brand with lookbook, collections, and store',
    automobile: 'Car dealership with inventory, specs, and financing',
    personal: 'Personal website with bio, social links, and blog',
    generic: 'Generic multi-purpose landing page',
};
const MINIMAL_GENERIC_TEMPLATE_DIR = path.resolve(__dirname, '..', '..', '..', 'templates', 'minimal-generic');
function collectFilesSync(dir, rootDir, out, skipDirs) {
    const entries = (0, fs_1.readdirSync)(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (skipDirs.has(entry.name))
            continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            collectFilesSync(fullPath, rootDir, out, skipDirs);
        }
        else if (entry.isFile()) {
            const relPath = path.relative(rootDir, fullPath);
            if (entry.name === 'manifest.json')
                continue;
            out[relPath] = (0, fs_1.readFileSync)(fullPath, 'utf-8');
        }
    }
}
function injectDeploymentFilesSync(files, templateDir) {
    const sharedDir = path.join(templateDir, '..', '_shared');
    const deploymentFiles = {
        Dockerfile: 'Dockerfile',
        'docker-compose.yaml': 'docker-compose.yaml',
    };
    for (const [sharedName, targetName] of Object.entries(deploymentFiles)) {
        if (Object.prototype.hasOwnProperty.call(files, targetName)) {
            continue;
        }
        const filePath = path.join(sharedDir, sharedName);
        if ((0, fs_1.existsSync)(filePath)) {
            try {
                files[targetName] = (0, fs_1.readFileSync)(filePath, 'utf-8');
            }
            catch {
            }
        }
    }
}
function loadMinimalGenericTemplate() {
    const candidates = [
        MINIMAL_GENERIC_TEMPLATE_DIR,
        path.resolve(process.cwd(), 'src', 'templates', 'minimal-generic'),
    ];
    for (const dir of candidates) {
        if ((0, fs_1.existsSync)(dir)) {
            const files = {};
            try {
                collectFilesSync(dir, dir, files, new Set(['node_modules', '.git', '.next', 'dist', '.agent_state', '.playwright-mcp']));
                if (Object.keys(files).length > 0) {
                    injectDeploymentFilesSync(files, dir);
                    return files;
                }
            }
            catch {
            }
        }
    }
    return {};
}
exports.MINIMAL_GENERIC_TEMPLATE = loadMinimalGenericTemplate();
let TemplateService = TemplateService_1 = class TemplateService {
    constructor() {
        this.logger = new common_1.Logger(TemplateService_1.name);
        this.skipDirs = new Set([
            'node_modules',
            '.git',
            '.next',
            'dist',
            '.agent_state',
            '.playwright-mcp',
        ]);
        const fromDist = path.resolve(process.cwd(), 'dist', 'templates');
        const fromSource = path.resolve(process.cwd(), 'src', 'templates');
        this.templatesDir = (0, fs_1.existsSync)(fromDist) ? fromDist : fromSource;
    }
    listCategories() {
        return { ...TEMPLATE_CATEGORIES };
    }
    async getTemplateFiles(category) {
        const templateDir = this.resolveCategoryDir(category);
        try {
            const files = {};
            await this.collectFiles(templateDir, templateDir, files);
            return this.injectSharedFiles(files);
        }
        catch (err) {
            this.logger.warn(`Could not read template directory ${templateDir}: ${err instanceof Error ? err.message : String(err)}`);
            return {};
        }
    }
    async getTemplateManifest(category) {
        const manifestPath = path.join(this.resolveCategoryDir(category), 'manifest.json');
        try {
            const content = await fs_1.promises.readFile(manifestPath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            return {
                name: category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                category,
                recommended_packages: ['react', 'react-dom', 'lucide-react', 'pocketbase'],
            };
        }
    }
    async getDbSchema(category) {
        const schemaPath = path.join(this.resolveCategoryDir(category), 'db_schema.json');
        try {
            const content = await fs_1.promises.readFile(schemaPath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            return {};
        }
    }
    async getGenericTemplate() {
        const genericDir = path.join(this.templatesDir, 'generic');
        try {
            await fs_1.promises.access(genericDir);
            const files = {};
            await this.collectFiles(genericDir, genericDir, files);
            if (Object.keys(files).length > 0)
                return this.injectSharedFiles(files);
        }
        catch {
        }
        const minimalDir = path.join(this.templatesDir, 'minimal-generic');
        try {
            await fs_1.promises.access(minimalDir);
            const files = {};
            await this.collectFiles(minimalDir, minimalDir, files);
            if (Object.keys(files).length > 0)
                return this.injectSharedFiles(files);
        }
        catch {
        }
        const minimal = { ...exports.MINIMAL_GENERIC_TEMPLATE };
        return this.injectSharedFiles(minimal);
    }
    resolveCategoryDir(category) {
        return path.join(this.templatesDir, category);
    }
    async collectFiles(dir, rootDir, out) {
        const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (this.skipDirs.has(entry.name)) {
                continue;
            }
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await this.collectFiles(fullPath, rootDir, out);
            }
            else if (entry.isFile()) {
                const relPath = path.relative(rootDir, fullPath);
                if (entry.name === 'manifest.json')
                    continue;
                try {
                    out[relPath] = await fs_1.promises.readFile(fullPath, 'utf-8');
                }
                catch (err) {
                    this.logger.warn(`Skipping unreadable template file ${relPath}`);
                }
            }
        }
    }
    injectSharedFiles(files) {
        const result = { ...files };
        const bridgePath = path.join(this.templatesDir, '_shared', 'ai-website-editor-bridge.js');
        let bridgeContent = null;
        try {
            bridgeContent = (0, fs_1.existsSync)(bridgePath) ? (0, fs_1.readFileSync)(bridgePath, 'utf-8') : null;
        }
        catch (err) {
            this.logger.warn(`Could not read visual-editing bridge ${bridgePath}: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (bridgeContent) {
            result['public/ai-website-editor-bridge.js'] = bridgeContent;
            const indexHtml = result['index.html'];
            if (indexHtml && !indexHtml.includes('ai-website-editor-bridge.js')) {
                result['index.html'] = indexHtml.replace('</body>', '  <script src="/ai-website-editor-bridge.js"></script>\n  </body>');
            }
        }
        const sharedDir = path.join(this.templatesDir, '_shared');
        const deploymentFiles = {
            Dockerfile: 'Dockerfile',
            'docker-compose.yaml': 'docker-compose.yaml',
        };
        for (const [sharedName, targetName] of Object.entries(deploymentFiles)) {
            if (Object.prototype.hasOwnProperty.call(result, targetName)) {
                continue;
            }
            const filePath = path.join(sharedDir, sharedName);
            if ((0, fs_1.existsSync)(filePath)) {
                try {
                    result[targetName] = (0, fs_1.readFileSync)(filePath, 'utf-8');
                }
                catch (err) {
                    this.logger.warn(`Could not read shared deployment file ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
                }
            }
        }
        return result;
    }
};
exports.TemplateService = TemplateService;
exports.TemplateService = TemplateService = TemplateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TemplateService);
//# sourceMappingURL=template.service.js.map