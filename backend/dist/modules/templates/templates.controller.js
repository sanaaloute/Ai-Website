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
var TemplatesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplatesController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/guards/auth.guard");
const template_catalog_service_1 = require("./template-catalog.service");
const template_fetch_service_1 = require("./template-fetch.service");
const fetch_template_dto_1 = require("./dto/fetch-template.dto");
let TemplatesController = TemplatesController_1 = class TemplatesController {
    constructor(catalog, fetcher) {
        this.catalog = catalog;
        this.fetcher = fetcher;
        this.logger = new common_1.Logger(TemplatesController_1.name);
    }
    async listCategories() {
        const categories = await this.catalog.listCategories();
        return { success: true, categories };
    }
    async getCategory(category) {
        const catalog = await this.catalog.getCategory(category);
        if (!catalog) {
            throw new common_1.HttpException({ success: false, error: `Unknown template category "${category}"` }, common_1.HttpStatus.NOT_FOUND);
        }
        return { success: true, catalog };
    }
    async getTemplate(category, template) {
        const entry = await this.catalog.findTemplate(category, template);
        if (!entry) {
            throw new common_1.HttpException({ success: false, error: `Unknown template "${template}" in category "${category}"` }, common_1.HttpStatus.NOT_FOUND);
        }
        const meta = await this.catalog.getTemplateMeta(category, entry.path);
        return { success: true, template: meta ?? entry };
    }
    async fetchTemplate(dto) {
        const source = dto.source ?? 'auto';
        const entry = await this.catalog.findTemplate(dto.category, dto.template);
        if (!entry && source !== 'github') {
            throw new common_1.HttpException({ success: false, error: `Unknown template "${dto.template}" in category "${dto.category}"` }, common_1.HttpStatus.NOT_FOUND);
        }
        const templatePath = entry ? entry.path : dto.template;
        if (source === 'auto' || source === 'local') {
            const files = await this.catalog.getLocalTemplateFiles(dto.category, templatePath);
            if (files) {
                return {
                    success: true,
                    category: dto.category,
                    template: entry?.id ?? dto.template,
                    source: 'local',
                    fileCount: Object.keys(files).length,
                    files,
                };
            }
            if (source === 'local') {
                throw new common_1.HttpException({ success: false, error: 'Local templates directory is not available' }, common_1.HttpStatus.NOT_FOUND);
            }
        }
        const repoPath = `templates/${dto.category}/${templatePath}`;
        const files = await this.fetcher.fetchTemplate(repoPath);
        return {
            success: true,
            category: dto.category,
            template: entry?.id ?? dto.template,
            source: 'github',
            fileCount: Object.keys(files).length,
            files,
        };
    }
};
exports.TemplatesController = TemplatesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "listCategories", null);
__decorate([
    (0, common_1.Get)(':category'),
    __param(0, (0, common_1.Param)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "getCategory", null);
__decorate([
    (0, common_1.Get)(':category/:template'),
    __param(0, (0, common_1.Param)('category')),
    __param(1, (0, common_1.Param)('template')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "getTemplate", null);
__decorate([
    (0, common_1.Post)('fetch'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fetch_template_dto_1.FetchTemplateDto]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "fetchTemplate", null);
exports.TemplatesController = TemplatesController = TemplatesController_1 = __decorate([
    (0, common_1.Controller)('api/templates'),
    __metadata("design:paramtypes", [template_catalog_service_1.TemplateCatalogService,
        template_fetch_service_1.TemplateFetchService])
], TemplatesController);
//# sourceMappingURL=templates.controller.js.map