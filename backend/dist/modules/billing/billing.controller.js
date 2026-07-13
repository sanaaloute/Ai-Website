"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/guards/auth.guard");
const user_decorator_1 = require("../../common/decorators/user.decorator");
const stripe_service_1 = require("../../lib/stripe.service");
const entitlements_service_1 = require("./entitlements.service");
const plans_1 = require("../../lib/plans");
const env_1 = require("../../config/env");
let BillingController = class BillingController {
    constructor(stripe, entitlements) {
        this.stripe = stripe;
        this.entitlements = entitlements;
    }
    async checkout(user, body) {
        if (!body.priceId)
            throw new common_1.HttpException({ success: false, error: 'priceId required' }, common_1.HttpStatus.BAD_REQUEST);
        const url = await this.stripe.createCheckoutSession({
            userId: user.id,
            priceId: body.priceId,
            mode: body.billingMode === 'subscription' ? 'subscription' : 'payment',
            successUrl: body.successUrl,
            cancelUrl: body.cancelUrl,
        });
        return { url };
    }
    async portal(user, body) {
        const url = await this.stripe.createPortalSession(user.id, body.returnUrl);
        return { url };
    }
    async syncCheckout(body) {
        if (!body.sessionId)
            throw new common_1.HttpException({ success: false, error: 'sessionId required' }, common_1.HttpStatus.BAD_REQUEST);
        const ok = await this.stripe.syncCheckoutSession(body.sessionId);
        return { ok };
    }
    async getEntitlements(user) {
        return { ok: true, ...(await this.entitlements.getEntitlements(user.id)) };
    }
    getBillingPlans() {
        const e = (0, env_1.env)();
        const plans = plans_1.PAID_PLAN_IDS.map((id) => {
            const def = plans_1.PLANS[id];
            const key = id.toUpperCase();
            return {
                id,
                label: def.label,
                priceMonthly: def.priceMonthly,
                priceYearly: def.priceYearly,
                priceIdMonthly: e.stripePrices[`${key}_MONTHLY`] ?? null,
                priceIdYearly: e.stripePrices[`${key}_YEARLY`] ?? null,
                features: def.features.map((f) => ({
                    id: f,
                    label: plans_1.FEATURE_LABELS[f],
                    requiredPlan: plans_1.FEATURE_REQUIRED_PLAN[f],
                })),
                limits: def.limits,
            };
        });
        return {
            ok: true,
            trial: {
                id: 'trial',
                label: plans_1.PLANS.trial.label,
                priceMonthly: 0,
                priceYearly: 0,
                features: [],
                limits: plans_1.PLANS.trial.limits,
            },
            plans,
        };
    }
    async webhook(req, signature, res) {
        if (!signature) {
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ success: false, error: 'Missing stripe-signature' });
        }
        try {
            const rawBody = req.rawBody ?? Buffer.from('');
            const result = await this.stripe.handleWebhook(rawBody, signature);
            return res.json(result);
        }
        catch (err) {
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ success: false, error: err instanceof Error ? err.message : String(err) });
        }
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Post)('checkout'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "checkout", null);
__decorate([
    (0, common_1.Post)('billing/portal'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "portal", null);
__decorate([
    (0, common_1.Post)('billing/sync-checkout-session'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "syncCheckout", null);
__decorate([
    (0, common_1.Get)('entitlements'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getEntitlements", null);
__decorate([
    (0, common_1.Get)('billing/plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "getBillingPlans", null);
__decorate([
    (0, common_1.Post)('stripe/webhook'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('stripe-signature')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "webhook", null);
exports.BillingController = BillingController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [stripe_service_1.StripeService,
        entitlements_service_1.EntitlementsService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map