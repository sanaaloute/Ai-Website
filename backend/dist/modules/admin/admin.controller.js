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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const admin_agent_service_1 = require("./admin-agent.service");
const admin_guard_1 = require("./admin.guard");
const current_admin_decorator_1 = require("./current-admin.decorator");
const cookie_service_1 = require("../../lib/cookie.service");
const dto_1 = require("./dto");
let AdminController = class AdminController {
    constructor(adminService, adminAgentService, cookies) {
        this.adminService = adminService;
        this.adminAgentService = adminAgentService;
        this.cookies = cookies;
    }
    async register(dto, registrationSecret) {
        return this.adminService.register(dto, registrationSecret);
    }
    async login(dto, req, res) {
        const result = await this.adminService.login(dto);
        this.cookies.setAdminToken(res, result.access_token, result.expires_in, req);
        return { success: result.success, admin: result.admin };
    }
    async logout(req, res) {
        this.cookies.clearAdminCookie(res, req);
        return { success: true };
    }
    async forgotPassword(dto) {
        return this.adminService.forgotPassword(dto);
    }
    async resetPassword(dto) {
        return this.adminService.resetPassword(dto);
    }
    getMe(admin) {
        return this.adminService.getMe(admin);
    }
    getStats() {
        return this.adminService.getStats();
    }
    getUsers(query) {
        return this.adminService.getUsers(query);
    }
    getUserById(id) {
        return this.adminService.getUserById(id);
    }
    updateUserStatus(admin, id, dto) {
        return this.adminService.updateUserStatus(admin, id, dto);
    }
    async deleteUser(admin, id) {
        await this.adminService.deleteUser(admin, id);
    }
    getSubscriptions(query) {
        return this.adminService.getSubscriptions(query);
    }
    cancelSubscription(admin, id, dto) {
        return this.adminService.cancelSubscription(admin, id, dto);
    }
    getBehavior() {
        return this.adminService.getBehavior();
    }
    getActivity(query) {
        return this.adminService.getActivityLogs(query);
    }
    getGenerations(query) {
        return this.adminAgentService.getGenerations(query);
    }
    getGenerationMetrics() {
        return this.adminAgentService.getGenerationMetrics();
    }
    getQueueMetrics() {
        return this.adminAgentService.getQueueMetrics();
    }
    getSandboxInventory() {
        return this.adminAgentService.getSandboxInventory();
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Post)('auth/register'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-admin-registration-secret')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.AdminRegisterDto, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('auth/login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.AdminLoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('auth/logout'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('auth/forgot-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.AdminForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('auth/reset-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.AdminResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Get)('auth/me'),
    (0, common_1.UseGuards)(admin_guard_1.AdminAuthGuard),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getMe", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, common_1.UseGuards)(admin_guard_1.AdminAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, common_1.UseGuards)(admin_guard_1.AdminAuthGuard),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.UserListQueryDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    (0, common_1.UseGuards)(admin_guard_1.AdminAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUserById", null);
__decorate([
    (0, common_1.Patch)('users/:id/status'),
    (0, common_1.UseGuards)(admin_guard_1.AdminAuthGuard),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateUserStatusDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateUserStatus", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, common_1.UseGuards)(admin_guard_1.AdminAuthGuard),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Get)('subscriptions'),
    (0, common_1.UseGuards)(admin_guard_1.AdminAuthGuard),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.SubscriptionListQueryDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getSubscriptions", null);
__decorate([
    (0, common_1.Patch)('subscriptions/:id/cancel'),
    (0, common_1.UseGuards)(admin_guard_1.AdminAuthGuard),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.CancelSubscriptionDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.Get)('behavior'),
    (0, common_1.UseGuards)(admin_guard_1.AdminAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getBehavior", null);
__decorate([
    (0, common_1.Get)('activity'),
    (0, common_1.UseGuards)(admin_guard_1.AdminAuthGuard),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ActivityQueryDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getActivity", null);
__decorate([
    (0, common_1.Get)('generations'),
    (0, common_1.UseGuards)(admin_guard_1.AdminAuthGuard),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getGenerations", null);
__decorate([
    (0, common_1.Get)('generations/metrics'),
    (0, common_1.UseGuards)(admin_guard_1.AdminAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getGenerationMetrics", null);
__decorate([
    (0, common_1.Get)('queue'),
    (0, common_1.UseGuards)(admin_guard_1.AdminAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getQueueMetrics", null);
__decorate([
    (0, common_1.Get)('sandboxes'),
    (0, common_1.UseGuards)(admin_guard_1.AdminAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getSandboxInventory", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('api/admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        admin_agent_service_1.AdminAgentService,
        cookie_service_1.CookieService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map