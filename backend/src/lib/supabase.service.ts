import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { env } from '@/config/env';

/**
 * Hard timeout for every Supabase HTTP call. Without it, a stalled or
 * unreachable Supabase endpoint makes supabase-js fetch hang forever,
 * which freezes every guarded API request (and the profile page UI).
 */
const SUPABASE_FETCH_TIMEOUT_MS = 10_000;

const timedFetch: typeof fetch = (input, init) => {
  const timeoutSignal = AbortSignal.timeout(SUPABASE_FETCH_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  return fetch(input, { ...init, signal });
};

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  public readonly admin: SupabaseClient;
  public readonly anon: SupabaseClient;

  constructor() {
    const e = env();
    this.admin = createClient(e.supabaseUrl, e.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: timedFetch },
    });
    this.anon = createClient(e.supabaseUrl, e.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: timedFetch },
    });
  }

  async getUser(id: string): Promise<{ data: User | null; error: Error | null }> {
    try {
      const { data, error } = await this.admin.auth.admin.getUserById(id);
      return { data: data.user, error };
    } catch (err) {
      this.logger.error(`Failed to fetch user ${id}`, err instanceof Error ? err.stack : undefined);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  async getProfile(userId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.admin.from('users').select('*').eq('id', userId).single();
    if (error) {
      this.logger.warn(`getProfile error: ${error.message}`);
      return null;
    }
    return data;
  }

  async updateProfile(userId: string, patch: Record<string, unknown>): Promise<boolean> {
    const { error } = await this.admin.from('users').update(patch).eq('id', userId);
    if (error) {
      this.logger.error(`updateProfile error: ${error.message}`);
      return false;
    }
    return true;
  }

  async updateSubscriptionFromStripe(
    customerId: string,
    subscription: Record<string, unknown> | null,
    status: string | null,
    plan: string | null,
  ): Promise<void> {
    const { data: customer } = await this.admin.from('customers').select('user_id').eq('stripe_customer_id', customerId).single();
    if (!customer?.user_id) return;

    if (subscription) {
      const { error } = await this.admin.from('subscriptions').upsert(
        {
          user_id: customer.user_id,
          stripe_subscription_id: subscription.id,
          status: status ?? subscription.status,
          plan,
          metadata: subscription,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_subscription_id' },
      );
      if (error) this.logger.error(`subscriptions upsert error: ${error.message}`);
    }

    const { error: userErr } = await this.admin
      .from('users')
      .update({ subscribed: status === 'active', subscription_type: plan })
      .eq('id', customer.user_id);
    if (userErr) this.logger.error(`users update error: ${userErr.message}`);
  }
}
