import { Paddle } from '@paddle/paddle-node-sdk';
import { SupabaseService } from './supabase.service';
export declare class PaddleService {
    private readonly supabase;
    private readonly logger;
    readonly paddle: Paddle | null;
    constructor(supabase: SupabaseService);
    get configured(): boolean;
    getCatalogPrices(): Promise<Record<string, {
        monthly: number;
        yearly: number;
    }>>;
    private fetchPriceAmount;
    createCheckoutSession(params: {
        userId: string;
        priceId: string;
        mode: 'subscription' | 'payment';
        successUrl: string;
        cancelUrl: string;
    }): Promise<string | null>;
    createCustomerPortalSession(userId: string, returnUrl: string): Promise<string | null>;
    syncCheckoutSession(transactionId: string): Promise<boolean>;
    handleWebhook(rawBody: Buffer, signature: string): Promise<{
        received: boolean;
    }>;
    cancelSubscription(paddleSubscriptionId: string): Promise<void>;
    private getOrCreateCustomer;
    private upsertSubscriptionState;
    private extractPlanFromSubscription;
    private extractPlanFromTransaction;
    private priceIdToPlan;
    private extractBillingInterval;
    private extractSubscriptionIdFromTransaction;
    private extractStatusFromTransaction;
    private extractCustomerIdFromSubscription;
    private extractCustomerIdFromTransaction;
    private stubCheckoutUrl;
    private stubPortalUrl;
}
