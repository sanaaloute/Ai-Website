import { SupabaseClient, User } from '@supabase/supabase-js';
export declare class SupabaseService {
    private readonly logger;
    readonly admin: SupabaseClient;
    readonly anon: SupabaseClient;
    constructor();
    getUser(id: string): Promise<{
        data: User | null;
        error: Error | null;
    }>;
    getProfile(userId: string): Promise<Record<string, unknown> | null>;
    updateProfile(userId: string, patch: Record<string, unknown>): Promise<boolean>;
    updateSubscriptionFromStripe(customerId: string, subscription: Record<string, unknown> | null, status: string | null, plan: string | null): Promise<void>;
}
