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
exports.E2BController = void 0;
const common_1 = require("@nestjs/common");
const optional_auth_guard_1 = require("../../common/guards/optional-auth.guard");
const e2b_service_1 = require("../../lib/e2b.service");
let E2BController = class E2BController {
    constructor(e2b) {
        this.e2b = e2b;
    }
    async attach(body) {
        if (!body.sandboxId)
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        const data = await this.e2b.attach(body.sandboxId);
        if (!data)
            throw new common_1.HttpException({ success: false, error: 'SANDBOX_GONE', code: 'SANDBOX_GONE' }, common_1.HttpStatus.GONE);
        return { success: true, recovered: true, sandboxData: data };
    }
    async cloneRepo(body) {
        if (!body.sandboxId || !body.repoUrl) {
            throw new common_1.HttpException({ success: false, error: 'sandboxId and repoUrl required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const result = await this.e2b.runCommand(body.sandboxId, `cd /home/user/app && rm -rf .[!.]* ..?* * 2>/dev/null || true && git clone ${body.repoUrl} .`);
        const files = await this.e2b.readFiles(body.sandboxId);
        return { success: result.exitCode === 0, files: files.files, structure: files.structure, fileCount: files.fileCount };
    }
    async sandboxes(state, limit) {
        const sandboxes = await this.e2b.listRunning();
        let filtered = sandboxes;
        if (state)
            filtered = filtered.filter((s) => s.state === state);
        const n = parseInt(limit ?? '25', 10);
        return { success: true, sandboxes: filtered.slice(0, n) };
    }
    async terminate(body) {
        if (!body.sandboxId)
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        const killed = await this.e2b.kill(body.sandboxId);
        return { success: true, sandboxKilled: killed };
    }
};
exports.E2BController = E2BController;
__decorate([
    (0, common_1.Post)('attach'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], E2BController.prototype, "attach", null);
__decorate([
    (0, common_1.Post)('clone-repo'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], E2BController.prototype, "cloneRepo", null);
__decorate([
    (0, common_1.Get)('sandboxes'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Query)('state')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], E2BController.prototype, "sandboxes", null);
__decorate([
    (0, common_1.Post)('terminate'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], E2BController.prototype, "terminate", null);
exports.E2BController = E2BController = __decorate([
    (0, common_1.Controller)('api/e2b'),
    __metadata("design:paramtypes", [e2b_service_1.E2BService])
], E2BController);
//# sourceMappingURL=e2b.controller.js.map