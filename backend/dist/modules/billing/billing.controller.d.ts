import { Request, Response } from 'express';
import { User } from "../../types";
import { StripeService } from "../../lib/stripe.service";
export declare class BillingController {
    private readonly stripe;
    constructor(stripe: StripeService);
    checkout(user: User, body: {
        priceId: string;
        billingMode?: string;
        successUrl: string;
        cancelUrl: string;
    }): Promise<{
        url: string | null;
    }>;
    portal(user: User, body: {
        returnUrl: string;
    }): Promise<{
        url: string | null;
    }>;
    syncCheckout(body: {
        sessionId: string;
    }): Promise<{
        ok: boolean;
    }>;
    webhook(req: Request, signature: string, res: Response): Promise<Response<any, Record<string, any>>>;
}
