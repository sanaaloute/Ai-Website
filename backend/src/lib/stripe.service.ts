import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { env } from '@/config/env';
import { SupabaseService } from './supabase.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  public readonly stripe: Stripe | null = null;

  constructor(private readonly supabase: SupabaseService) {
    const e = env();
    if (e.stripeSecretKey) {
      this.stripe = new Stripe(e.stripeSecretKey, { apiVersion: '2023-10-16' as Stripe.LatestApiVersion });
    }
  }

  get configured(): boolean {
    return !!this.stripe;
  }

  async createCheckoutSession(params: {
    userId: string;
    priceId: string;
    mode: 'subscription' | 'payment';
    successUrl: string;
    cancelUrl: string;
  }): Promise<string | null> {
    if (!this.stripe) return this.stubCheckoutUrl();

    const e = env();
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

  async createPortalSession(userId: string, returnUrl: string): Promise<string | null> {
    if (!this.stripe) return this.stubPortalUrl();
    const customer = await this.getOrCreateCustomer(userId);
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl,
    });
    return session.url;
  }

  async syncCheckoutSession(sessionId: string): Promise<boolean> {
    if (!this.stripe) return true;
    const session = await this.stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    const userId = session.client_reference_id ?? session.metadata?.supabase_user_id;
    if (!userId) return false;

    const subscription = session.subscription && typeof session.subscription !== 'string' ? session.subscription : null;
    await this.upsertSubscriptionState(
      userId,
      subscription,
      session.subscription as string | undefined,
      session.status === 'complete' ? 'active' : 'incomplete',
    );
    return true;
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
    if (!this.stripe) {
      this.logger.warn('Stripe not configured; webhook ignored');
      return { received: true };
    }

    const e = env();
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, e.stripeWebhookSecret);

    if (event.type.startsWith('customer.subscription.')) {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const plan = this.extractPlan(sub);
      await this.supabase.updateSubscriptionFromStripe(customerId, sub as unknown as Record<string, unknown>, sub.status, plan);
    } else if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.supabase_user_id;
      if (userId && session.customer) {
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        const subscription = subscriptionId ? await this.stripe.subscriptions.retrieve(subscriptionId) : null;
        await this.upsertSubscriptionState(userId, subscription, subscriptionId, subscription?.status ?? 'active');
        await this.supabase.updateSubscriptionFromStripe(
          customerId,
          subscription as unknown as Record<string, unknown>,
          subscription?.status ?? 'active',
          this.extractPlan(subscription),
        );
      }
    }

    return { received: true };
  }

  private async getOrCreateCustomer(userId: string): Promise<Stripe.Customer> {
    if (!this.stripe) throw new Error('Stripe not configured');

    const { data: existing } = await this.supabase.admin.from('customers').select('stripe_customer_id').eq('user_id', userId).single();
    if (existing?.stripe_customer_id) {
      const customer = await this.stripe.customers.retrieve(existing.stripe_customer_id);
      if (!customer.deleted) return customer as Stripe.Customer;
    }

    const user = await this.supabase.getUser(userId);
    const customer = await this.stripe.customers.create({
      metadata: { supabase_user_id: userId },
      email: user.data?.email,
    });

    const { error } = await this.supabase.admin.from('customers').upsert(
      { user_id: userId, stripe_customer_id: customer.id, email: user.data?.email },
      { onConflict: 'user_id' },
    );
    if (error) this.logger.error(`customers upsert error: ${error.message}`);
    return customer;
  }

  private async upsertSubscriptionState(
    userId: string,
    subscription: Stripe.Subscription | null,
    subscriptionId: string | undefined,
    status: string,
  ): Promise<void> {
    if (subscription) {
      const { error } = await this.supabase.admin.from('subscriptions').upsert(
        {
          user_id: userId,
          stripe_subscription_id: subscriptionId ?? subscription.id,
          status,
          plan: this.extractPlan(subscription),
          metadata: subscription as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_subscription_id' },
      );
      if (error) this.logger.error(`subscriptions upsert error: ${error.message}`);
    }

    const { error } = await this.supabase.admin
      .from('users')
      .update({ subscribed: status === 'active', subscription_type: subscription ? this.extractPlan(subscription) : null })
      .eq('id', userId);
    if (error) this.logger.error(`users update error: ${error.message}`);
  }

  private extractPlan(subscription: Stripe.Subscription | null): string | null {
    if (!subscription) return null;
    const item = subscription.items.data[0];
    const priceId = item?.price?.id;
    const e = env();
    for (const [key, value] of Object.entries(e.stripePrices)) {
      if (value === priceId) {
        return key.split('_')[0].toLowerCase();
      }
    }
    return item?.price?.nickname ?? 'basic';
  }

  private stubCheckoutUrl(): string {
    return `${env().appUrl}/checkout/stub?mode=subscription`;
  }

  private stubPortalUrl(): string {
    return `${env().appUrl}/billing/stub`;
  }
}
