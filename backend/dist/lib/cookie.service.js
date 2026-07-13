"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CookieService = void 0;
const common_1 = require("@nestjs/common");
const env_1 = require("../config/env");
let CookieService = class CookieService {
    baseOptions() {
        const e = (0, env_1.env)();
        return {
            httpOnly: true,
            sameSite: e.cookieSameSite,
            secure: e.cookieSecure,
            domain: e.cookieDomain,
            path: '/',
        };
    }
    requestHost(req) {
        if (!req)
            return undefined;
        const forwarded = req.headers['x-forwarded-host'];
        if (typeof forwarded === 'string' && forwarded.length > 0) {
            return forwarded;
        }
        return req.hostname;
    }
    requestIsSecure(req) {
        if (!req)
            return false;
        if (req.secure)
            return true;
        const proto = req.headers['x-forwarded-proto'];
        if (typeof proto === 'string') {
            return proto.toLowerCase() === 'https';
        }
        if (Array.isArray(proto) && proto.length > 0) {
            return proto[0].toLowerCase() === 'https';
        }
        return false;
    }
    resolvedOptions(req) {
        const opts = { ...this.baseOptions() };
        const isSecure = this.requestIsSecure(req);
        const explicitSecure = process.env.COOKIE_SECURE;
        if (isSecure && !explicitSecure) {
            opts.secure = true;
        }
        if (opts.sameSite === 'none' && !opts.secure) {
            opts.sameSite = 'lax';
        }
        return opts;
    }
    clearCookieVariants(res, name, req) {
        const host = this.requestHost(req);
        const base = this.resolvedOptions(req);
        const variants = [base];
        if (host) {
            variants.push({ ...base, domain: undefined });
            const parent = host.includes('.') ? `.${host}` : undefined;
            if (parent) {
                if (base.domain !== host) {
                    variants.push({ ...base, domain: host });
                }
                if (base.domain !== parent) {
                    variants.push({ ...base, domain: parent });
                }
            }
        }
        for (const variant of variants) {
            res.clearCookie(name, { ...variant, secure: true });
            res.clearCookie(name, { ...variant, secure: false });
        }
    }
    setAccessToken(res, token, maxAgeSeconds, req) {
        const e = (0, env_1.env)();
        this.clearCookieVariants(res, e.accessTokenCookieName, req);
        res.cookie(e.accessTokenCookieName, token, {
            ...this.resolvedOptions(req),
            maxAge: maxAgeSeconds * 1000,
        });
    }
    setRefreshToken(res, token, maxAgeSeconds, req) {
        const e = (0, env_1.env)();
        this.clearCookieVariants(res, e.refreshTokenCookieName, req);
        res.cookie(e.refreshTokenCookieName, token, {
            ...this.resolvedOptions(req),
            maxAge: maxAgeSeconds * 1000,
        });
    }
    setAdminToken(res, token, maxAgeSeconds, req) {
        const e = (0, env_1.env)();
        this.clearCookieVariants(res, e.adminTokenCookieName, req);
        res.cookie(e.adminTokenCookieName, token, {
            ...this.resolvedOptions(req),
            maxAge: maxAgeSeconds * 1000,
        });
    }
    clearAuthCookies(res, req) {
        const e = (0, env_1.env)();
        this.clearCookieVariants(res, e.accessTokenCookieName, req);
        this.clearCookieVariants(res, e.refreshTokenCookieName, req);
        const legacyAccessNames = ['sb-access-token', 'supabase-auth-token', 'sb-refresh-token'];
        for (const name of legacyAccessNames) {
            this.clearCookieVariants(res, name, req);
        }
    }
    clearAdminCookie(res, req) {
        const e = (0, env_1.env)();
        this.clearCookieVariants(res, e.adminTokenCookieName, req);
    }
};
exports.CookieService = CookieService;
exports.CookieService = CookieService = __decorate([
    (0, common_1.Injectable)()
], CookieService);
//# sourceMappingURL=cookie.service.js.map