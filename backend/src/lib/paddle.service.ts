import { Injectable, Logger } from '@nestjs/common';
import { Environment, EventName, Paddle } from '@paddle/paddle-node-sdk';
import { env } from '@/config/env';
import { SupabaseService } from './supabase.service';

@Injectable()
export class PaddleService {
  private readonly logger = new Logger(PaddleService.name);
  public readonly paddle: Paddle | null = null;

  constructor(private readonly supabase: SupabaseService) {
    const e = env();
    if (e.paddleApiKey) {
      this.paddle = new Paddle(e.paddleApiKey, {
        environment: e.paddleEnvironment === 'production' ? Environment.production : Environment.sandbox,
      });
    }
  }

  get configured(): boolean {
    return !!this.paddle;
  }

  async getCatalogPrices(): Promise<Record<string, { monthly: number; yearly: number }>> {
    const e = env();
    const result: Record<string, { monthly: number; yearly: number }> = {};
    if (!this.paddle) return result;

    for (const planId of ['basic', 'standard', 'pro'] as const) {
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

  private async fetchPriceAmount(priceId: string): Promise<number | null> {
    if (!this.paddle) return null;
    try {
      const price = await this.paddle.prices.get(priceId);
      const amount = price.unitPrice?.amount;
      if (!amount) return null;
      // Paddle amounts are in the smallest currency unit (e.g., cents for USD).
      return Number(amount) / 100;
    } catch (err) {
      this.logger.warn(`Failed to fetch Paddle price ${priceId}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  async createCheckoutSession(params: {
    userId: string;
    priceId: string;
    mode: 'subscription' | 'payment';
    successUrl: string;
    cancelUrl: string;
  }): Promise<string | null> {
    if (!this.paddle) return this.stubCheckoutUrl();

    const e = env();
    if (!Object.values(e.paddlePrices).includes(params.priceId)) {
      throw new Error('Price not in allowlist');
    }

    const customer = await this.getOrCreateCustomer(params.userId);

    const transaction = await this.paddle.transactions.create({
      items: [{ priceId: params.priceId, quantity: 1 }],
      customerId: customer.id,
      collectionMode: 'automatic',
    } as unknown as Parameters<Paddle['transactions']['create']>[0]);

    // The Paddle transaction response exposes the checkout URL as `checkout.url`.
    const checkoutUrl = (transaction as unknown as { checkout?: { url?: string | null } }).checkout?.url;
    return checkoutUrl ?? null;
  }

  async createCustomerPortalSession(userId: string, returnUrl: string): Promise<string | null> {
    if (!this.paddle) return this.stubPortalUrl();

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
    // Paddle customer portal sessions expose the overview URL at urls.general.overview.
    return session.urls.general.overview ?? returnUrl;
  }

  async syncCheckoutSession(transactionId: string): Promise<boolean> {
    if (!this.paddle) return true;
    const transaction = await this.paddle.transactions.get(transactionId);
    const data = transaction as unknown as Record<string, unknown>;
    const customerId = data.customerId as string | undefined;
    if (!customerId) return false;

    const subscriptionId = this.extractSubscriptionIdFromTransaction(data);
    const status = this.extractStatusFromTransaction(data);
    const plan = this.extractPlanFromTransaction(data);
    await this.supabase.updateSubscriptionFromPaddle(customerId, { id: subscriptionId, status, plan }, status, plan);
    return true;
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
    if (!this.paddle) {
      this.logger.warn('Paddle not configured; webhook ignored');
      return { received: true };
    }

    const e = env();
    const eventData = await this.paddle.webhooks.unmarshal(rawBody.toString(), e.paddleWebhookSecret, signature);
    const eventType = eventData.eventType as EventName | string;
    const data = eventData.data as unknown as Record<string, unknown>;

    this.logger.log(`Paddle webhook received: ${eventType}`);

    const subscriptionEvents = new Set<EventName | string>([
      EventName.SubscriptionActivated,
      EventName.SubscriptionCanceled,
      EventName.SubscriptionCreated,
      EventName.SubscriptionPastDue,
      EventName.SubscriptionPaused,
      EventName.SubscriptionResumed,
      EventName.SubscriptionTrialing,
      EventName.SubscriptionUpdated,
    ]);

    if (subscriptionEvents.has(eventType)) {
      const sub = data;
      const customerId = (sub.customerId as string) ?? this.extractCustomerIdFromSubscription(sub);
      const status = String(sub.status ?? 'active').toLowerCase();
      const plan = this.extractPlanFromSubscription(sub);
      const subscriptionId = String(sub.id ?? '');
      const billingInterval = this.extractBillingInterval(sub);
      const currentBillingPeriod = sub.currentBillingPeriod as { startsAt?: string; endsAt?: string } | undefined;
      const currentPeriodStart = currentBillingPeriod?.startsAt ? new Date(currentBillingPeriod.startsAt) : undefined;
      const currentPeriodEnd = currentBillingPeriod?.endsAt ? new Date(currentBillingPeriod.endsAt) : undefined;
      const scheduledChange = sub.scheduledChange as { action?: string } | undefined;
      const cancelAtPeriodEnd = scheduledChange?.action === 'cancel';

      await this.upsertSubscriptionState(
        customerId,
        subscriptionId,
        status,
        plan,
        billingInterval,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        sub,
      );
    } else if (eventType === EventName.TransactionCompleted || eventType === EventName.TransactionPaymentFailed) {
      const transaction = data;
      const customerId = (transaction.customerId as string) ?? this.extractCustomerIdFromTransaction(transaction);
      const subscriptionId = this.extractSubscriptionIdFromTransaction(transaction);
      const status = eventType === EventName.TransactionCompleted ? 'active' : 'past_due';
      const plan = this.extractPlanFromTransaction(transaction);
      const billingInterval = this.extractBillingInterval(transaction);

      await this.upsertSubscriptionState(
        customerId,
        subscriptionId ?? '',
        status,
        plan,
        billingInterval,
        undefined,
        undefined,
        false,
        transaction,
      );
    }

    return { received: true };
  }

  async cancelSubscription(paddleSubscriptionId: string): Promise<void> {
    if (!this.paddle) {
      this.logger.warn('Paddle not configured; cannot cancel subscription');
      return;
    }
    await this.paddle.subscriptions.cancel(paddleSubscriptionId, { effectiveFrom: 'next_billing_period' });
  }

  private async getOrCreateCustomer(userId: string): Promise<{ id: string }> {
    if (!this.paddle) throw new Error('Paddle not configured');

    const { data: existing } = await this.supabase.admin
      .from('customers')
      .select('paddle_customer_id')
      .eq('user_id', userId)
      .single();
    if (existing?.paddle_customer_id) {
      try {
        const customer = await this.paddle.customers.get(existing.paddle_customer_id);
        return { id: customer.id };
      } catch (err) {
        this.logger.warn(`Paddle customer ${existing.paddle_customer_id} not found, recreating`);
      }
    }

    const user = await this.supabase.getUser(userId);
    const email = user.data?.email;
    if (!email) throw new Error('User email required to create Paddle customer');

    const customer = await this.paddle.customers.create({ email });

    const { error } = await this.supabase.admin.from('customers').upsert(
      { user_id: userId, paddle_customer_id: customer.id, email },
      { onConflict: 'user_id' },
    );
    if (error) this.logger.error(`customers upsert error: ${error.message}`);
    return { id: customer.id };
  }

  private async upsertSubscriptionState(
    customerId: string,
    subscriptionId: string,
    status: string,
    plan: string | null,
    billingInterval: string | null,
    currentPeriodStart: Date | undefined,
    currentPeriodEnd: Date | undefined,
    cancelAtPeriodEnd: boolean,
    metadata: Record<string, unknown>,
  ): Promise<void> {
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
    const row: Record<string, unknown> = {
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
      if (error) this.logger.error(`subscriptions update error: ${error.message}`);
    } else {
      row.created_at = now;
      const { error } = await this.supabase.admin.from('subscriptions').insert(row);
      if (error) this.logger.error(`subscriptions insert error: ${error.message}`);
    }

    const { error: userErr } = await this.supabase.admin
      .from('users')
      .update({ subscribed: status === 'active', subscription_type: plan })
      .eq('id', userId);
    if (userErr) this.logger.error(`users update error: ${userErr.message}`);
  }

  private extractPlanFromSubscription(subscription: Record<string, unknown>): string | null {
    const items = (subscription.items as Array<Record<string, unknown>>) ?? [];
    const priceId = (items[0]?.price as Record<string, unknown>)?.id as string | undefined;
    if (!priceId) return null;
    return this.priceIdToPlan(priceId);
  }

  private extractPlanFromTransaction(transaction: Record<string, unknown>): string | null {
    const items = (transaction.items as Array<Record<string, unknown>>) ?? [];
    const priceId = (items[0]?.price as Record<string, unknown>)?.id as string | undefined;
    if (!priceId) return null;
    return this.priceIdToPlan(priceId);
  }

  private priceIdToPlan(priceId: string): string | null {
    const e = env();
    for (const [key, value] of Object.entries(e.paddlePrices)) {
      if (value === priceId) {
        return key.split('_')[0].toLowerCase();
      }
    }
    return null;
  }

  private extractBillingInterval(entity: Record<string, unknown>): string | null {
    const billingCycle = (entity.billingCycle ?? entity.billing_cycle) as Record<string, unknown> | undefined;
    if (billingCycle?.interval) return String(billingCycle.interval);
    const items = (entity.items as Array<Record<string, unknown>>) ?? [];
    const itemBillingCycle = (items[0]?.billingCycle as Record<string, unknown>) ?? (items[0]?.billing_cycle as Record<string, unknown>);
    return itemBillingCycle?.interval ? String(itemBillingCycle.interval) : null;
  }

  private extractSubscriptionIdFromTransaction(transaction: Record<string, unknown>): string | undefined {
    const subscriptionId = transaction.subscriptionId ?? transaction.subscription_id;
    if (subscriptionId) return String(subscriptionId);
    // Transaction items may include a subscription ID reference.
    const items = (transaction.items as Array<Record<string, unknown>>) ?? [];
    const first = items[0];
    if (first?.subscriptionId) return String(first.subscriptionId);
    return undefined;
  }

  private extractStatusFromTransaction(transaction: Record<string, unknown>): string {
    const status = transaction.status as string | undefined;
    if (status === 'ready' || status === 'billed' || status === 'completed') return 'active';
    if (status === 'payment_failed') return 'past_due';
    return status ?? 'active';
  }

  private extractCustomerIdFromSubscription(subscription: Record<string, unknown>): string {
    return String(subscription.customerId ?? subscription.customer_id ?? '');
  }

  private extractCustomerIdFromTransaction(transaction: Record<string, unknown>): string {
    return String(transaction.customerId ?? transaction.customer_id ?? '');
  }

  private stubCheckoutUrl(): string {
    return `${env().appUrl}/checkout/stub?mode=subscription`;
  }

  private stubPortalUrl(): string {
    return `${env().appUrl}/billing/stub`;
  }
}
