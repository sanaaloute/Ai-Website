import { HttpException } from '@nestjs/common';
import { SupabaseService } from "../../lib/supabase.service";
import { PrismaService } from "../../lib/prisma.service";
import { PlanDef, PlanFeature, PlanId } from "../../lib/plans";
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
export declare class PlanLimitException extends HttpException {
    constructor(params: {
        feature?: PlanFeature;
        quota?: PlanQuota;
        requiredPlan: PlanId;
    });
}
export declare class EntitlementsService {
    private readonly supabase;
    private readonly prisma;
    constructor(supabase: SupabaseService, prisma: PrismaService);
    private currentPeriod;
    getPlan(userId: string): Promise<PlanId>;
    getUsage(userId: string): Promise<EntitlementUsage>;
    getEntitlements(userId: string): Promise<Entitlements>;
    assertFeature(userId: string, feature: PlanFeature): Promise<void>;
    assertCanCreateProject(userId: string): Promise<void>;
    consumeGeneration(userId: string): Promise<void>;
    addSandboxSeconds(userId: string, seconds: number): Promise<void>;
    sandboxSecondsRemaining(userId: string): Promise<number>;
    assertSandboxTimeAvailable(userId: string): Promise<void>;
}
