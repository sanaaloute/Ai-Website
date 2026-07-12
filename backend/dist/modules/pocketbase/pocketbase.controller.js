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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PocketbaseController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/guards/auth.guard");
const user_decorator_1 = require("../../common/decorators/user.decorator");
const e2b_service_1 = require("../../lib/e2b.service");
const pocketbase_service_1 = require("../../lib/pocketbase.service");
const entitlements_service_1 = require("../billing/entitlements.service");
class PrepareDeployDto {
}
let PocketbaseController = class PocketbaseController {
    constructor(pocketbase, e2b, entitlements) {
        this.pocketbase = pocketbase;
        this.e2b = e2b;
        this.entitlements = entitlements;
    }
    async getTemplate(_user, category) {
        const resolvedCategory = category || 'ecommerce';
        const [files, schema, sdkSource] = await Promise.all([
            this.pocketbase.getTemplateFiles(resolvedCategory),
            this.pocketbase.getSchemaDescription(resolvedCategory),
            this.pocketbase.getFrontendSdkSource(resolvedCategory),
        ]);
        return {
            success: true,
            category: resolvedCategory,
            schema,
            sdkSource,
            files,
            fileCount: files.length,
        };
    }
    async prepareDeploy(user, body) {
        if (!body.projectName || !body.domain) {
            throw new common_1.HttpException({ success: false, error: 'projectName and domain are required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        await this.entitlements.assertFeature(user.id, 'db_integration');
        const deployment = await this.pocketbase.renderDeploymentFiles({
            projectName: body.projectName,
            domain: body.domain,
            pbSubdomainPrefix: body.pbSubdomainPrefix,
        });
        return {
            success: true,
            frontendUrl: deployment.frontendUrl,
            pocketbaseUrl: deployment.pocketbaseUrl,
            adminUrl: deployment.adminUrl,
            adminEmail: deployment.adminEmail,
            adminPassword: deployment.adminPassword,
            files: deployment.files,
            fileCount: deployment.files.length,
        };
    }
    async getPocketbaseInfo(_user, sandboxId) {
        if (!sandboxId) {
            throw new common_1.HttpException({ success: false, error: 'sandboxId is required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const info = await this.e2b.getPocketbaseInfo(sandboxId);
        if (!info) {
            return {
                success: true,
                url: null,
                adminUrl: null,
                adminEmail: null,
                adminPassword: null,
                message: 'PocketBase is not running in this sandbox',
            };
        }
        return {
            success: true,
            url: info.url,
            adminUrl: `${info.url}/_/`,
            adminEmail: info.adminEmail,
            adminPassword: info.adminPassword,
        };
    }
};
exports.PocketbaseController = PocketbaseController;
__decorate([
    (0, common_1.Get)('template'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PocketbaseController.prototype, "getTemplate", null);
__decorate([
    (0, common_1.Post)('prepare-deploy'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, PrepareDeployDto]),
    __metadata("design:returntype", Promise)
], PocketbaseController.prototype, "prepareDeploy", null);
__decorate([
    (0, common_1.Get)('info'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('sandboxId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PocketbaseController.prototype, "getPocketbaseInfo", null);
exports.PocketbaseController = PocketbaseController = __decorate([
    (0, common_1.Controller)('api/pocketbase'),
    __metadata("design:paramtypes", [pocketbase_service_1.PocketbaseService,
        e2b_service_1.E2BService,
        entitlements_service_1.EntitlementsService])
], PocketbaseController);
//# sourceMappingURL=pocketbase.controller.js.map