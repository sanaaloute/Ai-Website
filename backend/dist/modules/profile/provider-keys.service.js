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
var ProviderKeysService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderKeysService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../lib/supabase.service");
const ai_gateway_service_1 = require("../../lib/ai-gateway.service");
const llm_providers_1 = require("../../lib/llm-providers");
let ProviderKeysService = ProviderKeysService_1 = class ProviderKeysService {
    constructor(supabase, ai) {
        this.supabase = supabase;
        this.ai = ai;
        this.logger = new common_1.Logger(ProviderKeysService_1.name);
    }
    async fetchRows(userId) {
        const { data, error } = await this.supabase.admin
            .from('user_provider_keys')
            .select('provider, api_key')
            .eq('user_id', userId);
        if (error)
            throw new Error(error.message);
        return (data ?? []).filter((r) => (0, llm_providers_1.isProviderId)(r.provider));
    }
    async getActiveProvider(userId) {
        const { data } = await this.supabase.admin
            .from('users')
            .select('active_provider')
            .eq('id', userId)
            .single();
        return data?.active_provider ?? null;
    }
    async fetchLegacyKey(userId) {
        try {
            const profile = await this.supabase.getProfile(userId);
            const key = profile?.ai_website_api_key;
            return typeof key === 'string' && key.length > 0 ? key : null;
        }
        catch (e) {
            this.logger.warn(`Could not read legacy API key: ${e instanceof Error ? e.message : String(e)}`);
            return null;
        }
    }
    async listKeys(userId) {
        const rows = await this.fetchRows(userId);
        if (rows.length === 0) {
            const legacy = await this.fetchLegacyKey(userId);
            if (legacy) {
                return { activeProvider: 'tokenfree', keys: [{ provider: 'tokenfree', keyPreview: (0, llm_providers_1.previewKey)(legacy) }] };
            }
            return { activeProvider: null, keys: [] };
        }
        let active = await this.getActiveProvider(userId);
        if (!active || !rows.some((r) => r.provider === active)) {
            active = rows[0].provider;
        }
        return {
            activeProvider: active,
            keys: rows.map((r) => ({ provider: r.provider, keyPreview: (0, llm_providers_1.previewKey)(r.api_key) })),
        };
    }
    async saveKey(userId, provider, apiKey) {
        const validation = await this.ai.validateApiKey(apiKey, provider);
        if (!validation.valid && validation.authFailure) {
            return { ok: false, error: 'Invalid API key. Please check the key and try again.' };
        }
        const { error } = await this.supabase.admin.from('user_provider_keys').upsert({ user_id: userId, provider, api_key: apiKey, updated_at: new Date().toISOString() }, { onConflict: 'user_id,provider' });
        if (error)
            throw new Error(error.message);
        if (provider === 'tokenfree') {
            await this.supabase.admin.from('users').update({ ai_website_api_key: apiKey }).eq('id', userId);
        }
        const rows = await this.fetchRows(userId);
        let active = await this.getActiveProvider(userId);
        if (rows.length === 1 || !active || !rows.some((r) => r.provider === active)) {
            await this.supabase.admin.from('users').update({ active_provider: provider }).eq('id', userId);
            active = provider;
        }
        return {
            ok: true,
            keyPreview: (0, llm_providers_1.previewKey)(apiKey),
            activeProvider: active,
            validated: validation.valid,
            validationWarning: validation.warning,
        };
    }
    async deleteKey(userId, provider) {
        const { error } = await this.supabase.admin
            .from('user_provider_keys')
            .delete()
            .eq('user_id', userId)
            .eq('provider', provider);
        if (error)
            throw new Error(error.message);
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
    async setActiveProvider(userId, provider) {
        const rows = await this.fetchRows(userId);
        if (!rows.some((r) => r.provider === provider)) {
            return { ok: false, error: 'No API key stored for this provider.' };
        }
        const { error } = await this.supabase.admin
            .from('users')
            .update({ active_provider: provider })
            .eq('id', userId);
        if (error)
            throw new Error(error.message);
        return { ok: true, activeProvider: provider };
    }
    async resolveCredentials(userId) {
        const rows = await this.fetchRows(userId);
        if (rows.length === 0) {
            const legacy = await this.fetchLegacyKey(userId);
            return legacy ? [{ provider: 'tokenfree', apiKey: legacy }] : [];
        }
        const active = await this.getActiveProvider(userId);
        const sorted = [...rows].sort((a, b) => a.provider === active ? -1 : b.provider === active ? 1 : 0);
        return sorted.map((r) => ({ provider: r.provider, apiKey: r.api_key }));
    }
};
exports.ProviderKeysService = ProviderKeysService;
exports.ProviderKeysService = ProviderKeysService = ProviderKeysService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        ai_gateway_service_1.AiGatewayService])
], ProviderKeysService);
//# sourceMappingURL=provider-keys.service.js.map