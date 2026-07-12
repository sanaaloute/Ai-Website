import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '@/lib/supabase.service';
import { PrismaService } from '@/lib/prisma.service';
import {
  FEATURE_LABELS,
  FEATURE_REQUIRED_PLAN,
  LIFETIME_USAGE_PERIOD,
  PLANS,
  PlanDef,
  PlanFeature,
  PlanId,
  planFromSubscription,
  planHasFeature,
} from '@/lib/plans';

export type PlanQuota = 'generations' | 'sandbox_hours' | 'projects';

export interface EntitlementUsage {
  generations: number;
  sandboxSeconds: number;
  projects: number;
}

export interface Entitlements {
  plan: PlanId;
  planLabel: string;
  features: PlanFeature[];
  limits: PlanDef['limits'];
  usage: EntitlementUsage;
}

/**
 * Thrown (HTTP 402) when a user's plan does not allow an action. The frontend
 * recognizes `code: 'PLAN_LIMIT'` and opens the upgrade dialog.
 */
export class PlanLimitException extends HttpException {
  constructor(params: { feature?: PlanFeature; quota?: PlanQuota; requiredPlan: PlanId; lifetime?: boolean }) {
    const { feature, quota, requiredPlan, lifetime } = params;
    const what = feature
      ? FEATURE_LABELS[feature]
      : lifetime
        ? `Your lifetime ${quota?.replace('_', ' ')} limit`
        : `Your monthly ${quota?.replace('_', ' ')} limit`;
    super(
      {
        success: false,
        code: 'PLAN_LIMIT',
        feature: feature ?? null,
        quota: quota ?? null,
        requiredPlan,
        message: `${what} requires the ${PLANS[requiredPlan].label} plan. Upgrade to continue.`,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

/**
 * Resolves a user's plan, enforces feature gates and tracks monthly usage
 * (generations + sandbox seconds) in the `user_usage` table.
 */
@Injectable()
export class EntitlementsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  /** Current UTC month bucket, e.g. "2026-07". */
  private currentPeriod(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  async getPlan(userId: string): Promise<PlanId> {
    const { data } = await this.supabase.admin
      .from('users')
      .select('subscribed, subscription_type')
      .eq('id', userId)
      .single();
    return planFromSubscription(data?.subscribed, data?.subscription_type);
  }

  async getUsage(userId: string, plan?: PlanId): Promise<EntitlementUsage> {
    const resolvedPlan = plan ?? (await this.getPlan(userId));
    const period = this.currentPeriod();
    const hasLifetimeGenerations = PLANS[resolvedPlan].limits.generationsLifetime !== null;
    const [monthRow, lifetimeRow, projectsRes] = await Promise.all([
      this.prisma.user_usage.findUnique({
        where: { user_id_period: { user_id: userId, period } },
      }),
      hasLifetimeGenerations
        ? this.prisma.user_usage.findUnique({
            where: { user_id_period: { user_id: userId, period: LIFETIME_USAGE_PERIOD } },
          })
        : null,
      this.supabase.admin
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ]);
    return {
      generations: hasLifetimeGenerations
        ? (lifetimeRow?.generations ?? 0)
        : (monthRow?.generations ?? 0),
      sandboxSeconds: Number(monthRow?.sandbox_seconds ?? 0),
      projects: projectsRes.count ?? 0,
    };
  }

  async getEntitlements(userId: string): Promise<Entitlements> {
    const plan = await this.getPlan(userId);
    const usage = await this.getUsage(userId, plan);
    const def = PLANS[plan];
    return {
      plan,
      planLabel: def.label,
      features: def.features,
      limits: def.limits,
      usage,
    };
  }

  /** Throw 402 PLAN_LIMIT when the user's plan lacks a feature. */
  async assertFeature(userId: string, feature: PlanFeature): Promise<void> {
    const plan = await this.getPlan(userId);
    if (!planHasFeature(plan, feature)) {
      throw new PlanLimitException({ feature, requiredPlan: FEATURE_REQUIRED_PLAN[feature] });
    }
  }

  /** Throw 402 when the user reached their plan's project limit. */
  async assertCanCreateProject(userId: string): Promise<void> {
    const plan = await this.getPlan(userId);
    const usage = await this.getUsage(userId, plan);
    const limit = PLANS[plan].limits.maxProjects;
    if (limit !== null && usage.projects >= limit) {
      throw new PlanLimitException({ quota: 'projects', requiredPlan: 'standard' });
    }
  }

  /**
   * Atomically consume one generation from the user's quota. Plans with a
   * lifetime cap (`generationsLifetime`) are counted in a single non-expiring
   * bucket; other plans use the current-month bucket. Throws 402 PLAN_LIMIT
   * when the quota is exhausted. Unlimited plans (`generationsPerMonth: null`
   * and no lifetime cap) are still counted for stats.
   */
  async consumeGeneration(userId: string): Promise<void> {
    const plan = await this.getPlan(userId);
    const limits = PLANS[plan].limits;
    const isLifetime = limits.generationsLifetime !== null;
    const limit = limits.generationsLifetime ?? limits.generationsPerMonth;
    const period = isLifetime ? LIFETIME_USAGE_PERIOD : this.currentPeriod();

    if (limit === null) {
      await this.prisma.user_usage.upsert({
        where: { user_id_period: { user_id: userId, period } },
        create: { user_id: userId, period, generations: 1 },
        update: { generations: { increment: 1 } },
      });
      return;
    }

    // Atomic check-and-increment: the UPDATE only applies while under the
    // limit; zero rows returned means the quota is exhausted.
    const rows = await this.prisma.$queryRaw<{ generations: number }[]>`
      INSERT INTO user_usage (user_id, period, generations)
      VALUES (${userId}::uuid, ${period}, 1)
      ON CONFLICT (user_id, period)
      DO UPDATE SET generations = user_usage.generations + 1
      WHERE user_usage.generations < ${limit}
      RETURNING generations
    `;
    if (rows.length === 0) {
      throw new PlanLimitException({
        quota: 'generations',
        requiredPlan: plan === 'trial' ? 'basic' : 'standard',
        lifetime: isLifetime,
      });
    }
  }

  /** Accumulate sandbox runtime (seconds) into the user's current month. */
  async addSandboxSeconds(userId: string, seconds: number): Promise<void> {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const period = this.currentPeriod();
    const amount = BigInt(Math.round(seconds));
    await this.prisma.user_usage.upsert({
      where: { user_id_period: { user_id: userId, period } },
      create: { user_id: userId, period, sandbox_seconds: amount },
      update: { sandbox_seconds: { increment: amount } },
    });
  }

  /** Seconds of sandbox time left this month; Infinity for unlimited plans. */
  async sandboxSecondsRemaining(userId: string): Promise<number> {
    const plan = await this.getPlan(userId);
    const limit = PLANS[plan].limits.sandboxSecondsPerMonth;
    if (limit === null) return Infinity;
    const usage = await this.getUsage(userId, plan);
    return Math.max(0, limit - usage.sandboxSeconds);
  }

  /** Throw 402 when the user's monthly sandbox hours are exhausted. */
  async assertSandboxTimeAvailable(userId: string): Promise<void> {
    const remaining = await this.sandboxSecondsRemaining(userId);
    if (remaining <= 0) {
      const plan = await this.getPlan(userId);
      throw new PlanLimitException({ quota: 'sandbox_hours', requiredPlan: plan === 'pro' ? 'pro' : 'standard' });
    }
  }
}
