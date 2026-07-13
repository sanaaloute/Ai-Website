import { Request, Response } from 'express';
export interface CookieOptions {
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    domain?: string;
    path?: string;
}
type RequestLike = Pick<Request, 'secure' | 'hostname'> & {
    headers: Record<string, string | string[] | undefined>;
};
export declare class CookieService {
    private baseOptions;
    private requestHost;
    private requestIsSecure;
    private resolvedOptions;
    private clearCookieVariants;
    setAccessToken(res: Response, token: string, maxAgeSeconds: number, req?: RequestLike): void;
    setRefreshToken(res: Response, token: string, maxAgeSeconds: number, req?: RequestLike): void;
    setAdminToken(res: Response, token: string, maxAgeSeconds: number, req?: RequestLike): void;
    clearAuthCookies(res: Response, req?: RequestLike): void;
    clearAdminCookie(res: Response, req?: RequestLike): void;
}
export {};
