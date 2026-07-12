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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntitlementsService = exports.PlanLimitException = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../lib/supabase.service");
const prisma_service_1 = require("../../lib/prisma.service");
const plans_1 = require("../../lib/plans");
class PlanLimitException extends common_1.HttpException {
    constructor(params) {
        const { feature, quota, requiredPlan } = params;
        const what = feature ? plans_1.FEATURE_LABELS[feature] : `Your monthly ${quota?.replace('_', ' ')} limit`;
        super({
            success: false,
            code: 'PLAN_LIMIT',
            feature: feature ?? null,
            quota: quota ?? null,
            requiredPlan,
            message: `${what} requires the ${plans_1.PLANS[requiredPlan].label} plan. Upgrade to continue.`,
        }, common_1.HttpStatus.PAYMENT_REQUIRED);
    }
}
exports.PlanLimitException = PlanLimitException;
let EntitlementsService = class EntitlementsService {
    constructor(supabase, prisma) {
        this.supabase = supabase;
        this.prisma = prisma;
    }
    currentPeriod() {
        const d = new Date();
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    async getPlan(userId) {
        const { data } = await this.supabase.admin
            .from('users')
            .select('subscribed, subscription_type')
            .eq('id', userId)
            .single();
        return (0, plans_1.planFromSubscription)(data?.subscribed, data?.subscription_type);
    }
    async getUsage(userId) {
        const period = this.currentPeriod();
        const [row, projectsRes] = await Promise.all([
            this.prisma.user_usage.findUnique({
                where: { user_id_period: { user_id: userId, period } },
            }),
            this.supabase.admin
                .from('projects')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId),
        ]);
        return {
            generations: row?.generations ?? 0,
            sandboxSeconds: Number(row?.sandbox_seconds ?? 0),
            projects: projectsRes.count ?? 0,
        };
    }
    async getEntitlements(userId) {
        const [plan, usage] = await Promise.all([this.getPlan(userId), this.getUsage(userId)]);
        const def = plans_1.PLANS[plan];
        return {
            plan,
            planLabel: def.label,
            features: def.features,
            limits: def.limits,
            usage,
        };
    }
    async assertFeature(userId, feature) {
        const plan = await this.getPlan(userId);
        if (!(0, plans_1.planHasFeature)(plan, feature)) {
            throw new PlanLimitException({ feature, requiredPlan: plans_1.FEATURE_REQUIRED_PLAN[feature] });
        }
    }
    async assertCanCreateProject(userId) {
        const [plan, usage] = await Promise.all([this.getPlan(userId), this.getUsage(userId)]);
        const limit = plans_1.PLANS[plan].limits.maxProjects;
        if (limit !== null && usage.projects >= limit) {
            throw new PlanLimitException({ quota: 'projects', requiredPlan: 'standard' });
        }
    }
    async consumeGeneration(userId) {
        const plan = await this.getPlan(userId);
        const limit = plans_1.PLANS[plan].limits.generationsPerMonth;
        const period = this.currentPeriod();
        if (limit === null) {
            await this.prisma.user_usage.upsert({
                where: { user_id_period: { user_id: userId, period } },
                create: { user_id: userId, period, generations: 1 },
                update: { generations: { increment: 1 } },
            });
            return;
        }
        const rows = await this.prisma.$queryRaw `
      INSERT INTO user_usage (user_id, period, generations)
      VALUES (${userId}::uuid, ${period}, 1)
      ON CONFLICT (user_id, period)
      DO UPDATE SET generations = user_usage.generations + 1
      WHERE user_usage.generations < ${limit}
      RETURNING generations
    `;
        if (rows.length === 0) {
            throw new PlanLimitException({ quota: 'generations', requiredPlan: plan === 'trial' ? 'basic' : 'standard' });
        }
    }
    async addSandboxSeconds(userId, seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0)
            return;
        const period = this.currentPeriod();
        const amount = BigInt(Math.round(seconds));
        await this.prisma.user_usage.upsert({
            where: { user_id_period: { user_id: userId, period } },
            create: { user_id: userId, period, sandbox_seconds: amount },
            update: { sandbox_seconds: { increment: amount } },
        });
    }
    async sandboxSecondsRemaining(userId) {
        const plan = await this.getPlan(userId);
        const limit = plans_1.PLANS[plan].limits.sandboxSecondsPerMonth;
        if (limit === null)
            return Infinity;
        const usage = await this.getUsage(userId);
        return Math.max(0, limit - usage.sandboxSeconds);
    }
    async assertSandboxTimeAvailable(userId) {
        const remaining = await this.sandboxSecondsRemaining(userId);
        if (remaining <= 0) {
            const plan = await this.getPlan(userId);
            throw new PlanLimitException({ quota: 'sandbox_hours', requiredPlan: plan === 'pro' ? 'pro' : 'standard' });
        }
    }
};
exports.EntitlementsService = EntitlementsService;
exports.EntitlementsService = EntitlementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        prisma_service_1.PrismaService])
], EntitlementsService);
//# sourceMappingURL=entitlements.service.js.map