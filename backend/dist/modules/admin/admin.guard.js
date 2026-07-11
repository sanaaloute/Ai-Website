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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jsonwebtoken_1 = require("jsonwebtoken");
const env_1 = require("../../config/env");
const supabase_service_1 = require("../../lib/supabase.service");
let AdminAuthGuard = class AdminAuthGuard {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const token = this.extractToken(req);
        if (!token) {
            throw new common_1.UnauthorizedException({ success: false, error: 'Unauthorized' });
        }
        let payload;
        try {
            payload = (0, jsonwebtoken_1.verify)(token, (0, env_1.env)().adminJwtSecret, {
                algorithms: [(0, env_1.env)().adminJwtAlgorithm],
            });
        }
        catch {
            throw new common_1.UnauthorizedException({ success: false, error: 'Invalid or expired token' });
        }
        const { data: admin, error } = await this.supabase.admin
            .from('admin_users')
            .select('*')
            .eq('id', payload.sub)
            .single();
        if (error || !admin) {
            throw new common_1.UnauthorizedException({ success: false, error: 'Admin not found' });
        }
        req.admin = admin;
        return true;
    }
    extractToken(req) {
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.slice(7);
        }
        const cookies = req.headers['cookie'];
        if (!cookies)
            return undefined;
        const e = (0, env_1.env)();
        const match = cookies.match(new RegExp(`(?:^|;\\s*)${e.adminTokenCookieName}=([^;]+)`));
        if (match)
            return decodeURIComponent(match[1]);
        return undefined;
    }
};
exports.AdminAuthGuard = AdminAuthGuard;
exports.AdminAuthGuard = AdminAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], AdminAuthGuard);
//# sourceMappingURL=admin.guard.js.map