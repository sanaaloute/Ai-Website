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
exports.OptionalAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../lib/supabase.service");
const env_1 = require("../../config/env");
let OptionalAuthGuard = class OptionalAuthGuard {
    constructor(supabase) {
        this.supabase = supabase;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const token = this.extractToken(req);
        if (token) {
            try {
                const { data, error } = await this.supabase.admin.auth.getUser(token);
                if (!error && data.user) {
                    req.user = data.user;
                }
            }
            catch {
            }
        }
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
        const names = [e.accessTokenCookieName, 'sb-access-token', 'supabase-auth-token'];
        for (const name of names) {
            const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
            if (match)
                return decodeURIComponent(match[1]);
        }
        return undefined;
    }
};
exports.OptionalAuthGuard = OptionalAuthGuard;
exports.OptionalAuthGuard = OptionalAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], OptionalAuthGuard);
//# sourceMappingURL=optional-auth.guard.js.map