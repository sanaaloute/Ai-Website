import { Response } from 'express';
import { SupabaseService } from "../../lib/supabase.service";
import { E2BService } from "../../lib/e2b.service";
export declare class HealthController {
    private readonly supabase;
    private readonly e2b;
    constructor(supabase: SupabaseService, e2b: E2BService);
    health(): {
        status: string;
        version: string;
    };
    live(): {
        status: string;
    };
    ready(res: Response): Promise<void>;
}
