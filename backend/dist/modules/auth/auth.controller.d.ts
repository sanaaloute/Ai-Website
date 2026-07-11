import { Request, Response } from 'express';
import { User } from "../../types";
import { SupabaseService } from "../../lib/supabase.service";
import { CookieService } from "../../lib/cookie.service";
interface AuthResponse {
    success: boolean;
    user: User;
}
interface SignInDto {
    email: string;
    password: string;
}
interface SignUpDto {
    email: string;
    password: string;
    fullName?: string;
    phone?: string;
}
interface ResetPasswordDto {
    email: string;
    redirectTo?: string;
}
export declare class AuthController {
    private readonly supabase;
    private readonly cookies;
    constructor(supabase: SupabaseService, cookies: CookieService);
    private ensureUserProfile;
    private extractTokenFromRequest;
    session(user: User): {
        user: import("@supabase/auth-js").User;
    };
    signIn(body: SignInDto, req: Request, res: Response): Promise<AuthResponse>;
    signUp(body: SignUpDto, req: Request, res: Response): Promise<AuthResponse>;
    signOut(req: Request, res: Response): Promise<{
        success: boolean;
    }>;
    refresh(req: Request, res: Response): Promise<{
        success: boolean;
    }>;
    resetPassword(body: ResetPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
    legacyReset(body: {
        email?: string;
        redirectTo?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
}
export {};
