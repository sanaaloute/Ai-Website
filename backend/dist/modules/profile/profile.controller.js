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
exports.ProfileController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/guards/auth.guard");
const optional_auth_guard_1 = require("../../common/guards/optional-auth.guard");
const user_decorator_1 = require("../../common/decorators/user.decorator");
const supabase_service_1 = require("../../lib/supabase.service");
const provider_keys_service_1 = require("./provider-keys.service");
const llm_providers_1 = require("../../lib/llm-providers");
let ProfileController = class ProfileController {
    constructor(supabase, providerKeys) {
        this.supabase = supabase;
        this.providerKeys = providerKeys;
    }
    async getProfile(user) {
        const [profileRow, subscriptionRes] = await Promise.all([
            this.supabase.getProfile(user.id),
            this.supabase.admin
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single(),
        ]);
        const profile = profileRow ?? {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name ?? null,
            phone: null,
            avatar_url: user.user_metadata?.avatar_url ?? null,
            subscribed: false,
            subscription_type: null,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };
        const subscription = subscriptionRes.data;
        return {
            profile,
            subscription: subscription
                ? {
                    plan: subscription.plan ?? 'basic',
                    plan_label: (subscription.plan ?? 'Basic').replace(/^\w/, (c) => c.toUpperCase()),
                    billing_interval: subscription.billing_interval ?? 'month',
                    status: subscription.status ?? 'incomplete',
                    stripe_price_id: subscription.stripe_price_id ?? '',
                    price_display: '',
                }
                : null,
        };
    }
    async updateProfile(user, body) {
        const allowed = ['full_name', 'phone', 'avatar_url'];
        const patch = {};
        for (const key of allowed) {
            if (body[key] !== undefined)
                patch[key] = body[key];
        }
        patch.updated_at = new Date().toISOString();
        const ok = await this.supabase.updateProfile(user.id, patch);
        return { ok };
    }
    getLlmProviders() {
        return {
            ok: true,
            providers: (0, llm_providers_1.listProviders)().map((p) => ({
                id: p.id,
                label: p.label,
                keySiteUrl: p.keySiteUrl,
                models: p.models,
            })),
        };
    }
    async getProviderKeys(user) {
        const state = await this.providerKeys.listKeys(user.id);
        return { ok: true, ...state };
    }
    async saveProviderKey(user, provider, body) {
        if (!(0, llm_providers_1.isProviderId)(provider)) {
            throw new common_1.HttpException({ success: false, error: `Unknown provider: ${provider}` }, common_1.HttpStatus.BAD_REQUEST);
        }
        const apiKey = String(body.api_key ?? body.apiKey ?? '').trim();
        if (!apiKey)
            throw new common_1.HttpException({ success: false, error: 'api_key is required' }, common_1.HttpStatus.BAD_REQUEST);
        const result = await this.providerKeys.saveKey(user.id, provider, apiKey);
        if (!result.ok) {
            throw new common_1.HttpException({ success: false, error: result.error }, common_1.HttpStatus.BAD_REQUEST);
        }
        return { provider, ...result };
    }
    async deleteProviderKey(user, provider) {
        if (!(0, llm_providers_1.isProviderId)(provider)) {
            throw new common_1.HttpException({ success: false, error: `Unknown provider: ${provider}` }, common_1.HttpStatus.BAD_REQUEST);
        }
        const { activeProvider } = await this.providerKeys.deleteKey(user.id, provider);
        return { ok: true, provider, activeProvider };
    }
    async setActiveProvider(user, body) {
        const provider = String(body.provider ?? '').trim();
        if (!(0, llm_providers_1.isProviderId)(provider)) {
            throw new common_1.HttpException({ success: false, error: `Unknown provider: ${provider}` }, common_1.HttpStatus.BAD_REQUEST);
        }
        const result = await this.providerKeys.setActiveProvider(user.id, provider);
        if (!result.ok) {
            throw new common_1.HttpException({ success: false, error: result.error }, common_1.HttpStatus.BAD_REQUEST);
        }
        return result;
    }
    async getApiKey(user) {
        const state = await this.providerKeys.listKeys(user.id);
        const tokenfree = state.keys.find((k) => k.provider === 'tokenfree');
        return {
            ok: true,
            hasApiKey: !!tokenfree,
            keyPreview: tokenfree?.keyPreview ?? null,
        };
    }
    async saveApiKey(user, body) {
        const apiKey = String(body.api_key ?? body.apiKey ?? '').trim();
        if (!apiKey)
            throw new common_1.HttpException({ success: false, error: 'api_key is required' }, common_1.HttpStatus.BAD_REQUEST);
        const result = await this.providerKeys.saveKey(user.id, 'tokenfree', apiKey);
        if (!result.ok) {
            throw new common_1.HttpException({ success: false, error: result.error }, common_1.HttpStatus.BAD_REQUEST);
        }
        return {
            ok: true,
            hasApiKey: true,
            keyPreview: result.keyPreview,
            validated: result.validated,
            validationWarning: result.validationWarning,
        };
    }
    async deleteApiKey(user) {
        await this.providerKeys.deleteKey(user.id, 'tokenfree');
        return { ok: true, hasApiKey: false, keyPreview: null };
    }
    getConversationState(user, state) {
        return { state: state ?? '', userId: user?.id ?? null };
    }
    postConversationState(user, body) {
        return { state: body.action === 'reset' ? {} : body.state ?? {}, cleared: body.action === 'reset', userId: user?.id ?? null };
    }
    deleteConversationState(user) {
        return { state: {}, cleared: true, userId: user?.id ?? null };
    }
};
exports.ProfileController = ProfileController;
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('profile'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Get)('llm-providers'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "getLlmProviders", null);
__decorate([
    (0, common_1.Get)('provider-keys'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getProviderKeys", null);
__decorate([
    (0, common_1.Put)('provider-keys/:provider'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('provider')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "saveProviderKey", null);
__decorate([
    (0, common_1.Delete)('provider-keys/:provider'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('provider')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "deleteProviderKey", null);
__decorate([
    (0, common_1.Put)('provider-keys-active'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "setActiveProvider", null);
__decorate([
    (0, common_1.Get)('ai-website-api-key'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getApiKey", null);
__decorate([
    (0, common_1.Put)('ai-website-api-key'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "saveApiKey", null);
__decorate([
    (0, common_1.Delete)('ai-website-api-key'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "deleteApiKey", null);
__decorate([
    (0, common_1.Get)('conversation-state'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('state')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "getConversationState", null);
__decorate([
    (0, common_1.Post)('conversation-state'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "postConversationState", null);
__decorate([
    (0, common_1.Delete)('conversation-state'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "deleteConversationState", null);
exports.ProfileController = ProfileController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        provider_keys_service_1.ProviderKeysService])
], ProfileController);
//# sourceMappingURL=profile.controller.js.map