/**
 * Subscription plan catalog — single source of truth for tiers, limits and
 * feature gating. Prices are display-only; actual billing uses the Stripe
 * price IDs from env (`STRIPE_PRICE_<TIER>_<MONTHLY|YEARLY>`).
 *
 * Unsubscribed users fall into the free `trial` tier.
 */
export type PlanId = 'trial' | 'basic' | 'standard' | 'pro';

export type PlanFeature =
  | 'ai_editing'
  | 'zip_download'
  | 'github_push'
  | 'db_integration'
  | 'deploy'
  | 'custom_domain';

export interface PlanLimits {
  /** null = unlimited */
  generationsPerMonth: number | null;
  /** Lifetime generation cap, never reset. null = no lifetime cap. */
  generationsLifetime: number | null;
  /** null = unlimited */
  sandboxSecondsPerMonth: number | null;
  /** null = unlimited */
  maxProjects: number | null;
}

/**
 * Synthetic `user_usage.period` bucket for lifetime (non-monthly) counters.
 * Fits the Char(7) column and never collides with a real "YYYY-MM" period.
 */
export const LIFETIME_USAGE_PERIOD = '0000-00';

export interface PlanDef {
  id: PlanId;
  label: string;
  /** Display price in USD (monthly / yearly). 0 = free tier. */
  priceMonthly: number;
  priceYearly: number;
  features: PlanFeature[];
  limits: PlanLimits;
}

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  ai_editing: 'AI editing',
  zip_download: 'Download ZIP',
  github_push: 'Push to GitHub',
  db_integration: 'Database integration',
  deploy: 'One-click deploy',
  custom_domain: 'Custom domain',
};

/** Smallest paid plan that unlocks each feature (for upgrade prompts). */
export const FEATURE_REQUIRED_PLAN: Record<PlanFeature, PlanId> = {
  ai_editing: 'standard',
  zip_download: 'standard',
  github_push: 'standard',
  db_integration: 'pro',
  deploy: 'pro',
  custom_domain: 'pro',
};

const HOUR = 3600;

export const PLANS: Record<PlanId, PlanDef> = {
  trial: {
    id: 'trial',
    label: 'Trial',
    priceMonthly: 0,
    priceYearly: 0,
    features: [],
    limits: {
      generationsPerMonth: null,
      generationsLifetime: 3,
      sandboxSecondsPerMonth: 1 * HOUR,
      maxProjects: 1,
    },
  },
  basic: {
    id: 'basic',
    label: 'Basic',
    priceMonthly: 9.9,
    priceYearly: 108.9,
    features: [],
    limits: {
      generationsPerMonth: 10,
      generationsLifetime: null,
      sandboxSecondsPerMonth: 5 * HOUR,
      maxProjects: 3,
    },
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    priceMonthly: 19.9,
    priceYearly: 218.9,
    features: ['ai_editing', 'zip_download', 'github_push'],
    limits: {
      generationsPerMonth: 50,
      generationsLifetime: null,
      sandboxSecondsPerMonth: 30 * HOUR,
      maxProjects: null,
    },
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    priceMonthly: 39.9,
    priceYearly: 438.9,
    features: ['ai_editing', 'zip_download', 'github_push', 'db_integration', 'deploy', 'custom_domain'],
    limits: {
      generationsPerMonth: null,
      generationsLifetime: null,
      sandboxSecondsPerMonth: 100 * HOUR,
      maxProjects: null,
    },
  },
};

export const PAID_PLAN_IDS: PlanId[] = ['basic', 'standard', 'pro'];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && value in PLANS;
}

/**
 * Resolve a user's effective plan from their subscription columns.
 * Any unsubscribed (or unrecognized) user gets the free trial tier.
 */
export function planFromSubscription(subscribed: boolean | null | undefined, subscriptionType: string | null | undefined): PlanId {
  if (subscribed && isPlanId(subscriptionType) && subscriptionType !== 'trial') {
    return subscriptionType;
  }
  return 'trial';
}

export function planHasFeature(plan: PlanId, feature: PlanFeature): boolean {
  return PLANS[plan].features.includes(feature);
}

/** Rank for "is plan X at least plan Y" comparisons. */
export const PLAN_RANK: Record<PlanId, number> = { trial: 0, basic: 1, standard: 2, pro: 3 };
