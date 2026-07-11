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
var SupabaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("../config/env");
let SupabaseService = SupabaseService_1 = class SupabaseService {
    constructor() {
        this.logger = new common_1.Logger(SupabaseService_1.name);
        const e = (0, env_1.env)();
        this.admin = (0, supabase_js_1.createClient)(e.supabaseUrl, e.supabaseServiceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
        this.anon = (0, supabase_js_1.createClient)(e.supabaseUrl, e.supabaseAnonKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    }
    async getUser(id) {
        try {
            const { data, error } = await this.admin.auth.admin.getUserById(id);
            return { data: data.user, error };
        }
        catch (err) {
            this.logger.error(`Failed to fetch user ${id}`, err instanceof Error ? err.stack : undefined);
            return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
        }
    }
    async getProfile(userId) {
        const { data, error } = await this.admin.from('users').select('*').eq('id', userId).single();
        if (error) {
            this.logger.warn(`getProfile error: ${error.message}`);
            return null;
        }
        return data;
    }
    async updateProfile(userId, patch) {
        const { error } = await this.admin.from('users').update(patch).eq('id', userId);
        if (error) {
            this.logger.error(`updateProfile error: ${error.message}`);
            return false;
        }
        return true;
    }
    async updateSubscriptionFromStripe(customerId, subscription, status, plan) {
        const { data: customer } = await this.admin.from('customers').select('user_id').eq('stripe_customer_id', customerId).single();
        if (!customer?.user_id)
            return;
        if (subscription) {
            const { error } = await this.admin.from('subscriptions').upsert({
                user_id: customer.user_id,
                stripe_subscription_id: subscription.id,
                status: status ?? subscription.status,
                plan,
                metadata: subscription,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'stripe_subscription_id' });
            if (error)
                this.logger.error(`subscriptions upsert error: ${error.message}`);
        }
        const { error: userErr } = await this.admin
            .from('users')
            .update({ subscribed: status === 'active', subscription_type: plan })
            .eq('id', customer.user_id);
        if (userErr)
            this.logger.error(`users update error: ${userErr.message}`);
    }
};
exports.SupabaseService = SupabaseService;
exports.SupabaseService = SupabaseService = SupabaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SupabaseService);
//# sourceMappingURL=supabase.service.js.map