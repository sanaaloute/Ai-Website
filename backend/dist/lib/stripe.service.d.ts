import Stripe from 'stripe';
import { SupabaseService } from './supabase.service';
export declare class StripeService {
    private readonly supabase;
    private readonly logger;
    readonly stripe: Stripe | null;
    constructor(supabase: SupabaseService);
    get configured(): boolean;
    createCheckoutSession(params: {
        userId: string;
        priceId: string;
        mode: 'subscription' | 'payment';
        successUrl: string;
        cancelUrl: string;
    }): Promise<string | null>;
    createPortalSession(userId: string, returnUrl: string): Promise<string | null>;
    syncCheckoutSession(sessionId: string): Promise<boolean>;
    handleWebhook(rawBody: Buffer, signature: string): Promise<{
        received: boolean;
    }>;
    private getOrCreateCustomer;
    private upsertSubscriptionState;
    private extractPlan;
    private stubCheckoutUrl;
    private stubPortalUrl;
}
