import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { env } from '@/config/env';

export interface CookieOptions {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  domain?: string;
  path?: string;
}

/**
 * Minimal request shape needed to infer secure/domain options when the
 * cookie is set behind a reverse proxy.
 */
type RequestLike = Pick<Request, 'secure' | 'hostname'> & {
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class CookieService {
  private baseOptions(): CookieOptions {
    const e = env();
    return {
      httpOnly: true,
      sameSite: e.cookieSameSite,
      secure: e.cookieSecure,
      domain: e.cookieDomain,
      path: '/',
    };
  }

  private requestHost(req?: RequestLike): string | undefined {
    if (!req) return undefined;
    const forwarded = req.headers['x-forwarded-host'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded;
    }
    return req.hostname;
  }

  private requestIsSecure(req?: RequestLike): boolean {
    if (!req) return false;
    if (req.secure) return true;

    const proto = req.headers['x-forwarded-proto'];
    if (typeof proto === 'string') {
      return proto.toLowerCase() === 'https';
    }
    if (Array.isArray(proto) && proto.length > 0) {
      return proto[0].toLowerCase() === 'https';
    }
    return false;
  }

  /**
   * Resolve the cookie options that will actually be written.
   * - Honors explicit COOKIE_* environment values when they are set.
   * - When COOKIE_SECURE is not set and the request is HTTPS, mark cookies
   *   Secure so browsers do not drop them on production deployments.
   * - SameSite=None requires Secure; downgrade to lax otherwise to avoid
   *   browsers rejecting the cookie outright.
   */
  private resolvedOptions(req?: RequestLike): CookieOptions {
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

  /**
   * Clear a cookie under all common scoping combinations. This prevents stale
   * cookies from a previous config (different Domain or Secure flag) from
   * shadowing the freshly-set cookie and breaking session validation/refresh.
   */
  private clearCookieVariants(res: Response, name: string, req?: RequestLike): void {
    const host = this.requestHost(req);
    const base = this.resolvedOptions(req);
    const variants: CookieOptions[] = [base];

    if (host) {
      // Host-only variant (no Domain attribute).
      variants.push({ ...base, domain: undefined });

      // Parent-domain variants, in case a prior deployment used them.
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
      // Try both Secure and non-Secure so an old cookie with a different
      // Secure flag is removed regardless of the current config.
      res.clearCookie(name, { ...variant, secure: true });
      res.clearCookie(name, { ...variant, secure: false });
    }
  }

  setAccessToken(res: Response, token: string, maxAgeSeconds: number, req?: RequestLike): void {
    const e = env();
    this.clearCookieVariants(res, e.accessTokenCookieName, req);
    res.cookie(e.accessTokenCookieName, token, {
      ...this.resolvedOptions(req),
      maxAge: maxAgeSeconds * 1000,
    });
  }

  setRefreshToken(res: Response, token: string, maxAgeSeconds: number, req?: RequestLike): void {
    const e = env();
    this.clearCookieVariants(res, e.refreshTokenCookieName, req);
    res.cookie(e.refreshTokenCookieName, token, {
      ...this.resolvedOptions(req),
      maxAge: maxAgeSeconds * 1000,
    });
  }

  setAdminToken(res: Response, token: string, maxAgeSeconds: number, req?: RequestLike): void {
    const e = env();
    this.clearCookieVariants(res, e.adminTokenCookieName, req);
    res.cookie(e.adminTokenCookieName, token, {
      ...this.resolvedOptions(req),
      maxAge: maxAgeSeconds * 1000,
    });
  }

  clearAuthCookies(res: Response, req?: RequestLike): void {
    const e = env();
    this.clearCookieVariants(res, e.accessTokenCookieName, req);
    this.clearCookieVariants(res, e.refreshTokenCookieName, req);
    // Also purge legacy Supabase cookie names so an old token from a previous
    // client implementation cannot shadow the new LoveCode session.
    const legacyAccessNames = ['sb-access-token', 'supabase-auth-token', 'sb-refresh-token'];
    for (const name of legacyAccessNames) {
      this.clearCookieVariants(res, name, req);
    }
  }

  clearAdminCookie(res: Response, req?: RequestLike): void {
    const e = env();
    this.clearCookieVariants(res, e.adminTokenCookieName, req);
  }
}
