import { CanActivate, ExecutionContext } from '@nestjs/common';
import { SupabaseService } from "../../lib/supabase.service";
export declare class AdminAuthGuard implements CanActivate {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractToken;
}
