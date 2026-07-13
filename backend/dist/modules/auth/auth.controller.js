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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/guards/auth.guard");
const user_decorator_1 = require("../../common/decorators/user.decorator");
const supabase_service_1 = require("../../lib/supabase.service");
const cookie_service_1 = require("../../lib/cookie.service");
const env_1 = require("../../config/env");
const REFRESH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
let AuthController = class AuthController {
    constructor(supabase, cookies) {
        this.supabase = supabase;
        this.cookies = cookies;
    }
    async ensureUserProfile(user, fullName, phone) {
        try {
            const profile = {
                id: user.id,
                email: user.email,
                updated_at: new Date().toISOString(),
            };
            const fullNameValue = fullName ?? user.user_metadata?.full_name;
            const phoneValue = phone ?? user.user_metadata?.phone;
            if (fullNameValue)
                profile.full_name = fullNameValue;
            if (phoneValue)
                profile.phone = phoneValue;
            await this.supabase.admin.from('users').upsert(profile, { onConflict: 'id' });
        }
        catch {
        }
    }
    extractTokenFromRequest(req) {
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
    session(user) {
        return { user };
    }
    async signIn(body, req, res) {
        if (!body.email || !body.password) {
            throw new common_1.HttpException({ success: false, error: 'email and password required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const { data, error } = await this.supabase.anon.auth.signInWithPassword({
            email: body.email,
            password: body.password,
        });
        if (error || !data.session || !data.user) {
            throw new common_1.HttpException({ success: false, error: error?.message || 'sign in failed' }, common_1.HttpStatus.UNAUTHORIZED);
        }
        await this.ensureUserProfile(data.user);
        this.cookies.setAccessToken(res, data.session.access_token, data.session.expires_in, req);
        this.cookies.setRefreshToken(res, data.session.refresh_token, REFRESH_COOKIE_MAX_AGE_SECONDS, req);
        return { success: true, user: data.user };
    }
    async signUp(body, req, res) {
        if (!body.email || !body.password) {
            throw new common_1.HttpException({ success: false, error: 'email and password required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const { data, error } = await this.supabase.anon.auth.signUp({
            email: body.email,
            password: body.password,
            options: {
                data: {
                    full_name: body.fullName,
                    phone: body.phone,
                },
            },
        });
        if (error || !data.session || !data.user) {
            throw new common_1.HttpException({ success: false, error: error?.message || 'sign up failed' }, common_1.HttpStatus.BAD_REQUEST);
        }
        await this.ensureUserProfile(data.user, body.fullName, body.phone);
        this.cookies.setAccessToken(res, data.session.access_token, data.session.expires_in, req);
        this.cookies.setRefreshToken(res, data.session.refresh_token, REFRESH_COOKIE_MAX_AGE_SECONDS, req);
        return { success: true, user: data.user };
    }
    async signOut(req, res) {
        const token = this.extractTokenFromRequest(req);
        if (token) {
            const { data } = await this.supabase.admin.auth.getUser(token);
            if (data.user) {
                await this.supabase.admin.auth.admin.signOut(token).catch(() => {
                });
            }
        }
        this.cookies.clearAuthCookies(res, req);
        return { success: true };
    }
    async refresh(req, res) {
        const cookies = req.headers['cookie'];
        const e = (0, env_1.env)();
        let refreshToken;
        if (cookies) {
            const match = cookies.match(new RegExp(`(?:^|;\\s*)${e.refreshTokenCookieName}=([^;]+)`));
            if (match)
                refreshToken = decodeURIComponent(match[1]);
        }
        if (!refreshToken && typeof req.body === 'object' && req.body !== null && 'refresh_token' in req.body) {
            refreshToken = req.body.refresh_token;
        }
        if (!refreshToken) {
            throw new common_1.HttpException({ success: false, error: 'refresh_token required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const { data, error } = await this.supabase.anon.auth.refreshSession({ refresh_token: refreshToken });
        if (error || !data.session) {
            const msg = (error?.message ?? '').toLowerCase();
            const isDeadSession = msg.includes('invalid refresh token') ||
                msg.includes('refresh token not found') ||
                msg.includes('token has been revoked') ||
                msg.includes('jwt expired');
            if (isDeadSession) {
                this.cookies.clearAuthCookies(res, req);
            }
            throw new common_1.HttpException({ success: false, error: error?.message || 'session refresh failed' }, common_1.HttpStatus.UNAUTHORIZED);
        }
        this.cookies.setAccessToken(res, data.session.access_token, data.session.expires_in, req);
        this.cookies.setRefreshToken(res, data.session.refresh_token, REFRESH_COOKIE_MAX_AGE_SECONDS, req);
        return { success: true };
    }
    async resetPassword(body) {
        if (!body.email) {
            throw new common_1.HttpException({ success: false, error: 'email required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const { error } = await this.supabase.anon.auth.resetPasswordForEmail(body.email, {
            redirectTo: body.redirectTo,
        });
        if (error) {
            throw new common_1.HttpException({ success: false, error: error.message }, common_1.HttpStatus.BAD_REQUEST);
        }
        return { success: true, message: 'Password reset email sent' };
    }
    async legacyReset(body) {
        if (!body.email) {
            throw new common_1.HttpException({ success: false, error: 'email required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const { error } = await this.supabase.anon.auth.resetPasswordForEmail(body.email, {
            redirectTo: body.redirectTo,
        });
        if (error) {
            throw new common_1.HttpException({ success: false, error: error.message }, common_1.HttpStatus.BAD_REQUEST);
        }
        return { success: true, message: 'Password reset email sent' };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('auth/session'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "session", null);
__decorate([
    (0, common_1.Post)('auth/signin'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signIn", null);
__decorate([
    (0, common_1.Post)('auth/signup'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signUp", null);
__decorate([
    (0, common_1.Post)('auth/signout'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signOut", null);
__decorate([
    (0, common_1.Post)('auth/refresh'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('auth/reset-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('reset'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "legacyReset", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        cookie_service_1.CookieService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map