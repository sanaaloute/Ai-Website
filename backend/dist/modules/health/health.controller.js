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
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../lib/supabase.service");
const e2b_service_1 = require("../../lib/e2b.service");
let HealthController = class HealthController {
    constructor(supabase, e2b) {
        this.supabase = supabase;
        this.e2b = e2b;
    }
    health() {
        return { status: 'ok', version: '1.0.0' };
    }
    live() {
        return { status: 'ok' };
    }
    async ready(res) {
        let supabaseOk = false;
        try {
            const { error } = await this.supabase.admin.auth.getSession();
            supabaseOk = !error;
        }
        catch {
            supabaseOk = false;
        }
        const e2bOk = this.e2b.configured;
        const ready = supabaseOk && e2bOk;
        res.status(ready ? common_1.HttpStatus.OK : common_1.HttpStatus.SERVICE_UNAVAILABLE).json({
            status: ready ? 'ok' : 'not ready',
            supabase: supabaseOk,
            e2b: e2bOk,
        });
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('live'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "live", null);
__decorate([
    (0, common_1.Get)('ready'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "ready", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        e2b_service_1.E2BService])
], HealthController);
//# sourceMappingURL=health.controller.js.map