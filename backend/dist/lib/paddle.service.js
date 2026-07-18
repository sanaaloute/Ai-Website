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
var PaddleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaddleService = void 0;
const common_1 = require("@nestjs/common");
const paddle_node_sdk_1 = require("@paddle/paddle-node-sdk");
const env_1 = require("../config/env");
const supabase_service_1 = require("./supabase.service");
let PaddleService = PaddleService_1 = class PaddleService {
    constructor(supabase) {
        this.supabase = supabase;
        this.logger = new common_1.Logger(PaddleService_1.name);
        this.paddle = null;
        const e = (0, env_1.env)();
        if (e.paddleApiKey) {
            this.paddle = new paddle_node_sdk_1.Paddle(e.paddleApiKey, {
                environment: e.paddleEnvironment === 'production' ? paddle_node_sdk_1.Environment.production : paddle_node_sdk_1.Environment.sandbox,
            });
        }
    }
    get configured() {
        return !!this.paddle;
    }
    async getCatalogPrices() {
        const e = (0, env_1.env)();
        const result = {};
        if (!this.paddle)
            return result;
        for (const planId of ['basic', 'standard', 'pro']) {
            const key = planId.toUpperCase();
            const monthlyId = e.paddlePrices[`${key}_MONTHLY`];
            const yearlyId = e.paddlePrices[`${key}_YEARLY`];
            const monthly = monthlyId ? await this.fetchPriceAmount(monthlyId) : null;
            const yearly = yearlyId ? await this.fetchPriceAmount(yearlyId) : null;
            result[planId] = {
                monthly: monthly ?? 0,
                yearly: yearly ?? 0,
            };
        }
        return result;
    }
    async fetchPriceAmount(priceId) {
        if (!this.paddle)
            return null;
        try {
            const price = await this.paddle.prices.get(priceId);
            const amount = price.unitPrice?.amount;
            if (!amount)
                return null;
            return Number(amount) / 100;
        }
        catch (err) {
            this.logger.warn(`Failed to fetch Paddle price ${priceId}: ${err instanceof Error ? err.message : String(err)}`);
            return null;
        }
    }
    async createCheckoutSession(params) {
        if (!this.paddle)
            return this.stubCheckoutUrl();
        const e = (0, env_1.env)();
        if (!Object.values(e.paddlePrices).includes(params.priceId)) {
            throw new Error('Price not in allowlist');
        }
        const customer = await this.getOrCreateCustomer(params.userId);
        const transaction = await this.paddle.transactions.create({
            items: [{ priceId: params.priceId, quantity: 1 }],
            customerId: customer.id,
            collectionMode: 'automatic',
        });
        const checkoutUrl = transaction.checkout?.url;
        return checkoutUrl ?? null;
    }
    async createCustomerPortalSession(userId, returnUrl) {
        if (!this.paddle)
            return this.stubPortalUrl();
        const customer = await this.getOrCreateCustomer(userId);
        const { data: sub } = await this.supabase.admin
            .from('subscriptions')
            .select('paddle_subscription_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        const subscriptionIds = sub?.paddle_subscription_id ? [sub.paddle_subscription_id] : [];
        const session = await this.paddle.customerPortalSessions.create(customer.id, subscriptionIds);
        const urls = session.urls;
        return urls?.[0]?.url ?? returnUrl;
    }
    async syncCheckoutSession(transactionId) {
        if (!this.paddle)
            return true;
        const transaction = await this.paddle.transactions.get(transactionId);
        const data = transaction;
        const customerId = data.customerId;
        if (!customerId)
            return false;
        const subscriptionId = this.extractSubscriptionIdFromTransaction(data);
        const status = this.extractStatusFromTransaction(data);
        const plan = this.extractPlanFromTransaction(data);
        await this.supabase.updateSubscriptionFromPaddle(customerId, { id: subscriptionId, status, plan }, status, plan);
        return true;
    }
    async handleWebhook(rawBody, signature) {
        if (!this.paddle) {
            this.logger.warn('Paddle not configured; webhook ignored');
            return { received: true };
        }
        const e = (0, env_1.env)();
        const eventData = await this.paddle.webhooks.unmarshal(rawBody.toString(), e.paddleWebhookSecret, signature);
        const eventType = eventData.eventType;
        const data = eventData.data;
        this.logger.log(`Paddle webhook received: ${eventType}`);
        const subscriptionEvents = new Set([
            paddle_node_sdk_1.EventName.SubscriptionActivated,
            paddle_node_sdk_1.EventName.SubscriptionCanceled,
            paddle_node_sdk_1.EventName.SubscriptionCreated,
            paddle_node_sdk_1.EventName.SubscriptionPastDue,
            paddle_node_sdk_1.EventName.SubscriptionPaused,
            paddle_node_sdk_1.EventName.SubscriptionResumed,
            paddle_node_sdk_1.EventName.SubscriptionTrialing,
            paddle_node_sdk_1.EventName.SubscriptionUpdated,
        ]);
        if (subscriptionEvents.has(eventType)) {
            const sub = data;
            const customerId = sub.customerId ?? this.extractCustomerIdFromSubscription(sub);
            const status = String(sub.status ?? 'active').toLowerCase();
            const plan = this.extractPlanFromSubscription(sub);
            const subscriptionId = String(sub.id ?? '');
            const billingInterval = this.extractBillingInterval(sub);
            const currentBillingPeriod = sub.currentBillingPeriod;
            const currentPeriodStart = currentBillingPeriod?.startsAt ? new Date(currentBillingPeriod.startsAt) : undefined;
            const currentPeriodEnd = currentBillingPeriod?.endsAt ? new Date(currentBillingPeriod.endsAt) : undefined;
            const scheduledChange = sub.scheduledChange;
            const cancelAtPeriodEnd = scheduledChange?.action === 'cancel';
            await this.upsertSubscriptionState(customerId, subscriptionId, status, plan, billingInterval, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, sub);
        }
        else if (eventType === paddle_node_sdk_1.EventName.TransactionCompleted || eventType === paddle_node_sdk_1.EventName.TransactionPaymentFailed) {
            const transaction = data;
            const customerId = transaction.customerId ?? this.extractCustomerIdFromTransaction(transaction);
            const subscriptionId = this.extractSubscriptionIdFromTransaction(transaction);
            const status = eventType === paddle_node_sdk_1.EventName.TransactionCompleted ? 'active' : 'past_due';
            const plan = this.extractPlanFromTransaction(transaction);
            const billingInterval = this.extractBillingInterval(transaction);
            await this.upsertSubscriptionState(customerId, subscriptionId ?? '', status, plan, billingInterval, undefined, undefined, false, transaction);
        }
        return { received: true };
    }
    async cancelSubscription(paddleSubscriptionId) {
        if (!this.paddle) {
            this.logger.warn('Paddle not configured; cannot cancel subscription');
            return;
        }
        await this.paddle.subscriptions.cancel(paddleSubscriptionId, { effectiveFrom: 'next_billing_period' });
    }
    async getOrCreateCustomer(userId) {
        if (!this.paddle)
            throw new Error('Paddle not configured');
        const { data: existing } = await this.supabase.admin
            .from('customers')
            .select('paddle_customer_id')
            .eq('user_id', userId)
            .single();
        if (existing?.paddle_customer_id) {
            try {
                const customer = await this.paddle.customers.get(existing.paddle_customer_id);
                return { id: customer.id };
            }
            catch (err) {
                this.logger.warn(`Paddle customer ${existing.paddle_customer_id} not found, recreating`);
            }
        }
        const user = await this.supabase.getUser(userId);
        const email = user.data?.email;
        if (!email)
            throw new Error('User email required to create Paddle customer');
        const customer = await this.paddle.customers.create({ email });
        const { error } = await this.supabase.admin.from('customers').upsert({ user_id: userId, paddle_customer_id: customer.id, email }, { onConflict: 'user_id' });
        if (error)
            this.logger.error(`customers upsert error: ${error.message}`);
        return { id: customer.id };
    }
    async upsertSubscriptionState(customerId, subscriptionId, status, plan, billingInterval, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, metadata) {
        const { data: customer } = await this.supabase.admin
            .from('customers')
            .select('user_id')
            .eq('paddle_customer_id', customerId)
            .single();
        if (!customer?.user_id) {
            this.logger.warn(`No local customer for Paddle customer ${customerId}`);
            return;
        }
        const userId = customer.user_id;
        const { data: existing } = await this.supabase.admin
            .from('subscriptions')
            .select('id')
            .eq('paddle_subscription_id', subscriptionId)
            .single();
        const now = new Date().toISOString();
        const row = {
            user_id: userId,
            paddle_subscription_id: subscriptionId,
            status,
            plan,
            billing_interval: billingInterval,
            metadata,
            updated_at: now,
        };
        if (currentPeriodStart && !isNaN(currentPeriodStart.getTime())) {
            row.current_period_start = currentPeriodStart.toISOString();
        }
        if (currentPeriodEnd && !isNaN(currentPeriodEnd.getTime())) {
            row.current_period_end = currentPeriodEnd.toISOString();
        }
        if (cancelAtPeriodEnd !== undefined) {
            row.cancel_at_period_end = cancelAtPeriodEnd;
        }
        if (existing) {
            const { error } = await this.supabase.admin.from('subscriptions').update(row).eq('id', existing.id);
            if (error)
                this.logger.error(`subscriptions update error: ${error.message}`);
        }
        else {
            row.created_at = now;
            const { error } = await this.supabase.admin.from('subscriptions').insert(row);
            if (error)
                this.logger.error(`subscriptions insert error: ${error.message}`);
        }
        const { error: userErr } = await this.supabase.admin
            .from('users')
            .update({ subscribed: status === 'active', subscription_type: plan })
            .eq('id', userId);
        if (userErr)
            this.logger.error(`users update error: ${userErr.message}`);
    }
    extractPlanFromSubscription(subscription) {
        const items = subscription.items ?? [];
        const priceId = items[0]?.price?.id;
        if (!priceId)
            return null;
        return this.priceIdToPlan(priceId);
    }
    extractPlanFromTransaction(transaction) {
        const items = transaction.items ?? [];
        const priceId = items[0]?.price?.id;
        if (!priceId)
            return null;
        return this.priceIdToPlan(priceId);
    }
    priceIdToPlan(priceId) {
        const e = (0, env_1.env)();
        for (const [key, value] of Object.entries(e.paddlePrices)) {
            if (value === priceId) {
                return key.split('_')[0].toLowerCase();
            }
        }
        return null;
    }
    extractBillingInterval(entity) {
        const billingCycle = (entity.billingCycle ?? entity.billing_cycle);
        if (billingCycle?.interval)
            return String(billingCycle.interval);
        const items = entity.items ?? [];
        const itemBillingCycle = items[0]?.billingCycle ?? items[0]?.billing_cycle;
        return itemBillingCycle?.interval ? String(itemBillingCycle.interval) : null;
    }
    extractSubscriptionIdFromTransaction(transaction) {
        const subscriptionId = transaction.subscriptionId ?? transaction.subscription_id;
        if (subscriptionId)
            return String(subscriptionId);
        const items = transaction.items ?? [];
        const first = items[0];
        if (first?.subscriptionId)
            return String(first.subscriptionId);
        return undefined;
    }
    extractStatusFromTransaction(transaction) {
        const status = transaction.status;
        if (status === 'ready' || status === 'billed' || status === 'completed')
            return 'active';
        if (status === 'payment_failed')
            return 'past_due';
        return status ?? 'active';
    }
    extractCustomerIdFromSubscription(subscription) {
        return String(subscription.customerId ?? subscription.customer_id ?? '');
    }
    extractCustomerIdFromTransaction(transaction) {
        return String(transaction.customerId ?? transaction.customer_id ?? '');
    }
    stubCheckoutUrl() {
        return `${(0, env_1.env)().appUrl}/checkout/stub?mode=subscription`;
    }
    stubPortalUrl() {
        return `${(0, env_1.env)().appUrl}/billing/stub`;
    }
};
exports.PaddleService = PaddleService;
exports.PaddleService = PaddleService = PaddleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], PaddleService);
//# sourceMappingURL=paddle.service.js.map