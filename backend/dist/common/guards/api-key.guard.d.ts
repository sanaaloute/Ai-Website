import { CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { SupabaseService } from "../../lib/supabase.service";
export declare class LoveCodeApiKeyException extends HttpException {
    constructor();
}
export declare class ApiKeyGuard implements CanActivate {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
