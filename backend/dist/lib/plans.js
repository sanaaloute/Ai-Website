"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_RANK = exports.PAID_PLAN_IDS = exports.PLANS = exports.FEATURE_REQUIRED_PLAN = exports.FEATURE_LABELS = exports.LIFETIME_USAGE_PERIOD = void 0;
exports.isPlanId = isPlanId;
exports.planFromSubscription = planFromSubscription;
exports.planHasFeature = planHasFeature;
exports.LIFETIME_USAGE_PERIOD = '0000-00';
exports.FEATURE_LABELS = {
    github_push: 'Push to GitHub',
    db_integration: 'Database integration',
    deploy: 'One-click deploy',
    custom_domain: 'Custom domain',
    templates: 'Pre-built templates',
};
exports.FEATURE_REQUIRED_PLAN = {
    github_push: 'basic',
    db_integration: 'pro',
    deploy: 'basic',
    custom_domain: 'pro',
    templates: 'standard',
};
const HOUR = 3600;
exports.PLANS = {
    trial: {
        id: 'trial',
        label: 'Trial',
        priceMonthly: 0,
        priceYearly: 0,
        features: [],
        limits: {
            generationsPerMonth: null,
            generationsLifetime: 3,
            sandboxSecondsPerMonth: 10 * HOUR,
            maxProjects: 1,
        },
    },
    basic: {
        id: 'basic',
        label: 'Basic',
        priceMonthly: 9.9,
        priceYearly: 108.9,
        features: ['github_push', 'deploy'],
        limits: {
            generationsPerMonth: 10,
            generationsLifetime: null,
            sandboxSecondsPerMonth: 200 * HOUR,
            maxProjects: 3,
        },
    },
    standard: {
        id: 'standard',
        label: 'Standard',
        priceMonthly: 19.9,
        priceYearly: 218.9,
        features: ['github_push', 'deploy', 'templates'],
        limits: {
            generationsPerMonth: 50,
            generationsLifetime: null,
            sandboxSecondsPerMonth: 500 * HOUR,
            maxProjects: null,
        },
    },
    pro: {
        id: 'pro',
        label: 'Pro',
        priceMonthly: 39.9,
        priceYearly: 438.9,
        features: ['github_push', 'db_integration', 'deploy', 'custom_domain', 'templates'],
        limits: {
            generationsPerMonth: null,
            generationsLifetime: null,
            sandboxSecondsPerMonth: 700 * HOUR,
            maxProjects: null,
        },
    },
};
exports.PAID_PLAN_IDS = ['basic', 'standard', 'pro'];
function isPlanId(value) {
    return typeof value === 'string' && value in exports.PLANS;
}
function planFromSubscription(subscribed, subscriptionType) {
    if (subscribed && isPlanId(subscriptionType) && subscriptionType !== 'trial') {
        return subscriptionType;
    }
    return 'trial';
}
function planHasFeature(plan, feature) {
    return exports.PLANS[plan].features.includes(feature);
}
exports.PLAN_RANK = { trial: 0, basic: 1, standard: 2, pro: 3 };
//# sourceMappingURL=plans.js.map