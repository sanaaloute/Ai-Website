"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_RANK = exports.PAID_PLAN_IDS = exports.PLANS = exports.FEATURE_REQUIRED_PLAN = exports.FEATURE_LABELS = void 0;
exports.isPlanId = isPlanId;
exports.planFromSubscription = planFromSubscription;
exports.planHasFeature = planHasFeature;
exports.FEATURE_LABELS = {
    ai_editing: 'AI editing',
    zip_download: 'Download ZIP',
    github_push: 'Push to GitHub',
    db_integration: 'Database integration',
    deploy: 'One-click deploy',
    custom_domain: 'Custom domain',
};
exports.FEATURE_REQUIRED_PLAN = {
    ai_editing: 'standard',
    zip_download: 'standard',
    github_push: 'standard',
    db_integration: 'pro',
    deploy: 'pro',
    custom_domain: 'pro',
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
            generationsPerMonth: 3,
            sandboxSecondsPerMonth: 1 * HOUR,
            maxProjects: 1,
        },
    },
    basic: {
        id: 'basic',
        label: 'Basic',
        priceMonthly: 9,
        priceYearly: 90,
        features: [],
        limits: {
            generationsPerMonth: 10,
            sandboxSecondsPerMonth: 5 * HOUR,
            maxProjects: 3,
        },
    },
    standard: {
        id: 'standard',
        label: 'Standard',
        priceMonthly: 29,
        priceYearly: 290,
        features: ['ai_editing', 'zip_download', 'github_push'],
        limits: {
            generationsPerMonth: 50,
            sandboxSecondsPerMonth: 30 * HOUR,
            maxProjects: null,
        },
    },
    pro: {
        id: 'pro',
        label: 'Pro',
        priceMonthly: 79,
        priceYearly: 790,
        features: ['ai_editing', 'zip_download', 'github_push', 'db_integration', 'deploy', 'custom_domain'],
        limits: {
            generationsPerMonth: null,
            sandboxSecondsPerMonth: 100 * HOUR,
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