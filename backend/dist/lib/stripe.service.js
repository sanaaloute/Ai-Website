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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var StripeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const common_1 = require("@nestjs/common");
const stripe_1 = __importDefault(require("stripe"));
const env_1 = require("../config/env");
const supabase_service_1 = require("./supabase.service");
let StripeService = StripeService_1 = class StripeService {
    constructor(supabase) {
        this.supabase = supabase;
        this.logger = new common_1.Logger(StripeService_1.name);
        this.stripe = null;
        const e = (0, env_1.env)();
        if (e.stripeSecretKey) {
            this.stripe = new stripe_1.default(e.stripeSecretKey, { apiVersion: '2023-10-16' });
        }
    }
    get configured() {
        return !!this.stripe;
    }
    async createCheckoutSession(params) {
        if (!this.stripe)
            return this.stubCheckoutUrl();
        const e = (0, env_1.env)();
        if (!Object.values(e.stripePrices).includes(params.priceId)) {
            throw new Error('Price not in allowlist');
        }
        const customer = await this.getOrCreateCustomer(params.userId);
        const session = await this.stripe.checkout.sessions.create({
            customer: customer.id,
            line_items: [{ price: params.priceId, quantity: 1 }],
            mode: params.mode,
            success_url: params.successUrl,
            cancel_url: params.cancelUrl,
            client_reference_id: params.userId,
            metadata: { supabase_user_id: params.userId },
        });
        return session.url;
    }
    async createPortalSession(userId, returnUrl) {
        if (!this.stripe)
            return this.stubPortalUrl();
        const customer = await this.getOrCreateCustomer(userId);
        const session = await this.stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: returnUrl,
        });
        return session.url;
    }
    async syncCheckoutSession(sessionId) {
        if (!this.stripe)
            return true;
        const session = await this.stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
        const userId = session.client_reference_id ?? session.metadata?.supabase_user_id;
        if (!userId)
            return false;
        const subscription = session.subscription && typeof session.subscription !== 'string' ? session.subscription : null;
        await this.upsertSubscriptionState(userId, subscription, session.subscription, session.status === 'complete' ? 'active' : 'incomplete');
        return true;
    }
    async handleWebhook(rawBody, signature) {
        if (!this.stripe) {
            this.logger.warn('Stripe not configured; webhook ignored');
            return { received: true };
        }
        const e = (0, env_1.env)();
        const event = this.stripe.webhooks.constructEvent(rawBody, signature, e.stripeWebhookSecret);
        if (event.type.startsWith('customer.subscription.')) {
            const sub = event.data.object;
            const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
            const plan = this.extractPlan(sub);
            await this.supabase.updateSubscriptionFromStripe(customerId, sub, sub.status, plan);
        }
        else if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userId = session.client_reference_id ?? session.metadata?.supabase_user_id;
            if (userId && session.customer) {
                const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
                const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
                const subscription = subscriptionId ? await this.stripe.subscriptions.retrieve(subscriptionId) : null;
                await this.upsertSubscriptionState(userId, subscription, subscriptionId, subscription?.status ?? 'active');
                await this.supabase.updateSubscriptionFromStripe(customerId, subscription, subscription?.status ?? 'active', this.extractPlan(subscription));
            }
        }
        return { received: true };
    }
    async getOrCreateCustomer(userId) {
        if (!this.stripe)
            throw new Error('Stripe not configured');
        const { data: existing } = await this.supabase.admin.from('customers').select('stripe_customer_id').eq('user_id', userId).single();
        if (existing?.stripe_customer_id) {
            const customer = await this.stripe.customers.retrieve(existing.stripe_customer_id);
            if (!customer.deleted)
                return customer;
        }
        const user = await this.supabase.getUser(userId);
        const customer = await this.stripe.customers.create({
            metadata: { supabase_user_id: userId },
            email: user.data?.email,
        });
        const { error } = await this.supabase.admin.from('customers').upsert({ user_id: userId, stripe_customer_id: customer.id, email: user.data?.email }, { onConflict: 'user_id' });
        if (error)
            this.logger.error(`customers upsert error: ${error.message}`);
        return customer;
    }
    async upsertSubscriptionState(userId, subscription, subscriptionId, status) {
        if (subscription) {
            const { error } = await this.supabase.admin.from('subscriptions').upsert({
                user_id: userId,
                stripe_subscription_id: subscriptionId ?? subscription.id,
                status,
                plan: this.extractPlan(subscription),
                metadata: subscription,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'stripe_subscription_id' });
            if (error)
                this.logger.error(`subscriptions upsert error: ${error.message}`);
        }
        const { error } = await this.supabase.admin
            .from('users')
            .update({ subscribed: status === 'active', subscription_type: subscription ? this.extractPlan(subscription) : null })
            .eq('id', userId);
        if (error)
            this.logger.error(`users update error: ${error.message}`);
    }
    extractPlan(subscription) {
        if (!subscription)
            return null;
        const item = subscription.items.data[0];
        const priceId = item?.price?.id;
        const e = (0, env_1.env)();
        for (const [key, value] of Object.entries(e.stripePrices)) {
            if (value === priceId) {
                return key.split('_')[0].toLowerCase();
            }
        }
        return item?.price?.nickname ?? 'basic';
    }
    stubCheckoutUrl() {
        return `${(0, env_1.env)().appUrl}/checkout/stub?mode=subscription`;
    }
    stubPortalUrl() {
        return `${(0, env_1.env)().appUrl}/billing/stub`;
    }
};
exports.StripeService = StripeService;
exports.StripeService = StripeService = StripeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], StripeService);
//# sourceMappingURL=stripe.service.js.map