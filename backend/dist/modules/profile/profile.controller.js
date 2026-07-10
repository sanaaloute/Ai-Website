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
const ai_gateway_service_1 = require("../../lib/ai-gateway.service");
let ProfileController = class ProfileController {
    constructor(supabase, ai) {
        this.supabase = supabase;
        this.ai = ai;
    }
    async getProfile(user) {
        const profile = (await this.supabase.getProfile(user.id)) ?? {
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
        const { data: subscription } = await this.supabase.admin
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
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
    async getApiKey(user) {
        const profile = await this.supabase.getProfile(user.id);
        const key = profile?.lovecode_api_key ?? '';
        return {
            ok: true,
            hasApiKey: !!key,
            keyPreview: key ? `${key.slice(0, 5)}...${key.slice(-4)}` : null,
        };
    }
    async saveApiKey(user, body) {
        const apiKey = body.api_key ?? body.apiKey ?? '';
        if (!apiKey)
            throw new common_1.HttpException({ success: false, error: 'api_key is required' }, common_1.HttpStatus.BAD_REQUEST);
        const validation = await this.ai.validateApiKey(apiKey);
        const { error } = await this.supabase.admin.from('users').update({ lovecode_api_key: apiKey }).eq('id', user.id);
        if (error)
            throw new common_1.HttpException({ success: false, error: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        return {
            ok: true,
            hasApiKey: true,
            keyPreview: `${apiKey.slice(0, 5)}...${apiKey.slice(-4)}`,
            validated: validation.valid,
            validationWarning: validation.warning,
        };
    }
    async deleteApiKey(user) {
        const { error } = await this.supabase.admin.from('users').update({ lovecode_api_key: null }).eq('id', user.id);
        if (error)
            throw new common_1.HttpException({ success: false, error: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
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
    (0, common_1.Get)('lovecode-api-key'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getApiKey", null);
__decorate([
    (0, common_1.Put)('lovecode-api-key'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "saveApiKey", null);
__decorate([
    (0, common_1.Delete)('lovecode-api-key'),
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
        ai_gateway_service_1.AiGatewayService])
], ProfileController);
//# sourceMappingURL=profile.controller.js.map