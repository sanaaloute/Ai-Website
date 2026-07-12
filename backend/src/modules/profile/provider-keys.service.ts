import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@/lib/supabase.service';
import { AiGatewayService } from '@/lib/ai-gateway.service';
import { AiCredential, ProviderId, isProviderId, previewKey } from '@/lib/llm-providers';

export interface ProviderKeyView {
  provider: ProviderId;
  keyPreview: string;
}

export interface ProviderKeysState {
  activeProvider: ProviderId | null;
  keys: ProviderKeyView[];
}

interface ProviderKeyRow {
  provider: string;
  api_key: string;
}

/**
 * Manages per-user, per-provider LLM API keys stored in `user_provider_keys`.
 *
 * The active provider (`users.active_provider`) is tried first on every LLM
 * call; `resolveCredentials` returns the remaining providers afterwards so the
 * AI gateway can fall back to them when the active one fails. When the user
 * has exactly one stored key it is always the active provider.
 *
 * Legacy fallback: before the `user_provider_keys` table existed, the key
 * lived in `users.ai_website_api_key` (TokenFree). Reads fall back to that
 * column so un-migrated users keep working.
 */
@Injectable()
export class ProviderKeysService {
  private readonly logger = new Logger(ProviderKeysService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly ai: AiGatewayService,
  ) {}

  private async fetchRows(userId: string): Promise<ProviderKeyRow[]> {
    const { data, error } = await this.supabase.admin
      .from('user_provider_keys')
      .select('provider, api_key')
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as ProviderKeyRow[]).filter((r) => isProviderId(r.provider));
  }

  private async getActiveProvider(userId: string): Promise<string | null> {
    const { data } = await this.supabase.admin
      .from('users')
      .select('active_provider')
      .eq('id', userId)
      .single();
    return (data?.active_provider as string) ?? null;
  }

  private async fetchLegacyKey(userId: string): Promise<string | null> {
    try {
      const profile = await this.supabase.getProfile(userId);
      const key = profile?.ai_website_api_key;
      return typeof key === 'string' && key.length > 0 ? key : null;
    } catch (e) {
      this.logger.warn(`Could not read legacy API key: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  async listKeys(userId: string): Promise<ProviderKeysState> {
    const rows = await this.fetchRows(userId);

    if (rows.length === 0) {
      const legacy = await this.fetchLegacyKey(userId);
      if (legacy) {
        return { activeProvider: 'tokenfree', keys: [{ provider: 'tokenfree', keyPreview: previewKey(legacy) }] };
      }
      return { activeProvider: null, keys: [] };
    }

    let active = await this.getActiveProvider(userId);
    if (!active || !rows.some((r) => r.provider === active)) {
      // Single key -> always active; otherwise fall back to the first stored key.
      active = rows[0].provider;
    }

    return {
      activeProvider: active as ProviderId,
      keys: rows.map((r) => ({ provider: r.provider as ProviderId, keyPreview: previewKey(r.api_key) })),
    };
  }

  async saveKey(
    userId: string,
    provider: ProviderId,
    apiKey: string,
  ): Promise<
    | { ok: true; keyPreview: string; activeProvider: string | null; validated: boolean; validationWarning: string | null }
    | { ok: false; error: string }
  > {
    const validation = await this.ai.validateApiKey(apiKey, provider);
    if (!validation.valid && validation.authFailure) {
      // The provider definitively rejected this key (401/403 on every model).
      return { ok: false, error: 'Invalid API key. Please check the key and try again.' };
    }

    const { error } = await this.supabase.admin.from('user_provider_keys').upsert(
      { user_id: userId, provider, api_key: apiKey, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,provider' },
    );
    if (error) throw new Error(error.message);

    // Mirror TokenFree writes to the legacy column (kept for older readers).
    if (provider === 'tokenfree') {
      await this.supabase.admin.from('users').update({ ai_website_api_key: apiKey }).eq('id', userId);
    }

    const rows = await this.fetchRows(userId);
    let active = await this.getActiveProvider(userId);
    // Auto-activate when this is the user's only key, or when the recorded
    // active provider no longer has a key.
    if (rows.length === 1 || !active || !rows.some((r) => r.provider === active)) {
      await this.supabase.admin.from('users').update({ active_provider: provider }).eq('id', userId);
      active = provider;
    }

    return {
      ok: true,
      keyPreview: previewKey(apiKey),
      activeProvider: active,
      validated: validation.valid,
      validationWarning: validation.warning,
    };
  }

  async deleteKey(userId: string, provider: ProviderId): Promise<{ activeProvider: string | null }> {
    const { error } = await this.supabase.admin
      .from('user_provider_keys')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider);
    if (error) throw new Error(error.message);

    if (provider === 'tokenfree') {
      await this.supabase.admin.from('users').update({ ai_website_api_key: null }).eq('id', userId);
    }

    let active = await this.getActiveProvider(userId);
    if (active === provider) {
      const rows = await this.fetchRows(userId);
      const next = rows[0]?.provider ?? null;
      await this.supabase.admin.from('users').update({ active_provider: next }).eq('id', userId);
      active = next;
    }
    return { activeProvider: active };
  }

  async setActiveProvider(
    userId: string,
    provider: ProviderId,
  ): Promise<{ ok: true; activeProvider: string } | { ok: false; error: string }> {
    const rows = await this.fetchRows(userId);
    if (!rows.some((r) => r.provider === provider)) {
      return { ok: false, error: 'No API key stored for this provider.' };
    }
    const { error } = await this.supabase.admin
      .from('users')
      .update({ active_provider: provider })
      .eq('id', userId);
    if (error) throw new Error(error.message);
    return { ok: true, activeProvider: provider };
  }

  /**
   * Ordered credentials for LLM calls: active provider first, then the
   * user's other providers (fallback order). Empty when the user has no key.
   */
  async resolveCredentials(userId: string): Promise<AiCredential[]> {
    const rows = await this.fetchRows(userId);

    if (rows.length === 0) {
      const legacy = await this.fetchLegacyKey(userId);
      return legacy ? [{ provider: 'tokenfree', apiKey: legacy }] : [];
    }

    const active = await this.getActiveProvider(userId);
    const sorted = [...rows].sort((a, b) =>
      a.provider === active ? -1 : b.provider === active ? 1 : 0,
    );
    return sorted.map((r) => ({ provider: r.provider as ProviderId, apiKey: r.api_key }));
  }
}
