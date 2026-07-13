import { Request, Response } from 'express';
import { User } from "../../types";
import { StripeService } from "../../lib/stripe.service";
import { EntitlementsService } from './entitlements.service';
export declare class BillingController {
    private readonly stripe;
    private readonly entitlements;
    constructor(stripe: StripeService, entitlements: EntitlementsService);
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
    getEntitlements(user: User): Promise<{
        plan: import("@/lib/plans").PlanId;
        planLabel: string;
        features: import("@/lib/plans").PlanFeature[];
        limits: import("@/lib/plans").PlanDef["limits"];
        usage: import("./entitlements.service").EntitlementUsage;
        ok: boolean;
    }>;
    getBillingPlans(): {
        ok: boolean;
        trial: {
            id: string;
            label: string;
            priceMonthly: number;
            priceYearly: number;
            features: never[];
            limits: import("@/lib/plans").PlanLimits;
        };
        plans: {
            id: import("@/lib/plans").PlanId;
            label: string;
            priceMonthly: number;
            priceYearly: number;
            priceIdMonthly: string | null;
            priceIdYearly: string | null;
            features: {
                id: import("@/lib/plans").PlanFeature;
                label: string;
                requiredPlan: import("@/lib/plans").PlanId;
            }[];
            limits: import("@/lib/plans").PlanLimits;
        }[];
    };
    webhook(req: Request, signature: string, res: Response): Promise<Response<any, Record<string, any>>>;
}
