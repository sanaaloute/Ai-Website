export type PlanId = 'trial' | 'basic' | 'standard' | 'pro';
export type PlanFeature = 'ai_editing' | 'zip_download' | 'github_push' | 'db_integration' | 'deploy' | 'custom_domain';
export interface PlanLimits {
    generationsPerMonth: number | null;
    sandboxSecondsPerMonth: number | null;
    maxProjects: number | null;
}
export interface PlanDef {
    id: PlanId;
    label: string;
    priceMonthly: number;
    priceYearly: number;
    features: PlanFeature[];
    limits: PlanLimits;
}
export declare const FEATURE_LABELS: Record<PlanFeature, string>;
export declare const FEATURE_REQUIRED_PLAN: Record<PlanFeature, PlanId>;
export declare const PLANS: Record<PlanId, PlanDef>;
export declare const PAID_PLAN_IDS: PlanId[];
export declare function isPlanId(value: unknown): value is PlanId;
export declare function planFromSubscription(subscribed: boolean | null | undefined, subscriptionType: string | null | undefined): PlanId;
export declare function planHasFeature(plan: PlanId, feature: PlanFeature): boolean;
export declare const PLAN_RANK: Record<PlanId, number>;
