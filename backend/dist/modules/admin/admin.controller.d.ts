import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { AdminAgentService, GenerationsQuery } from './admin-agent.service';
import { AdminUser } from './admin.types';
import { CookieService } from "../../lib/cookie.service";
import { AdminRegisterDto, AdminLoginDto, AdminForgotPasswordDto, AdminResetPasswordDto, UpdateUserStatusDto, CancelSubscriptionDto, UserListQueryDto, SubscriptionListQueryDto, ActivityQueryDto } from './dto';
export declare class AdminController {
    private readonly adminService;
    private readonly adminAgentService;
    private readonly cookies;
    constructor(adminService: AdminService, adminAgentService: AdminAgentService, cookies: CookieService);
    register(dto: AdminRegisterDto, registrationSecret?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    login(dto: AdminLoginDto, req: Request, res: Response): Promise<{
        success: boolean;
        admin: import("./admin.types").AdminProfile;
    }>;
    logout(req: Request, res: Response): Promise<{
        success: boolean;
    }>;
    forgotPassword(dto: AdminForgotPasswordDto): Promise<Record<string, unknown>>;
    resetPassword(dto: AdminResetPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
    getMe(admin: AdminUser): import("./admin.types").AdminProfile;
    getStats(): Promise<{
        totalUsers: number;
        totalUsersChange: number;
        activeSubscriptions: number;
        activeSubscriptionsChange: number;
        mrr: number;
        mrrChange: number;
        churnRate: number;
        churnRateChange: number;
        signupsTrend: {
            date: string;
            value: number;
        }[];
        revenueTrend: {
            date: string;
            value: number;
        }[];
        planDistribution: {
            name: string;
            value: number;
        }[];
        userStatusDistribution: {
            name: string;
            value: number;
        }[];
    }>;
    getUsers(query: UserListQueryDto): Promise<{
        data: {
            id: unknown;
            name: unknown;
            email: unknown;
            avatar: {} | null;
            plan: string;
            status: string;
            joinDate: unknown;
            lastActive: unknown;
            loginFrequency: {};
            appUsageCount: {};
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    getUserById(id: string): Promise<{
        id: any;
        name: any;
        email: any;
        avatar: any;
        plan: string;
        status: string;
        joinDate: any;
        lastActive: any;
        phone: any;
        company: any;
        location: any;
        role: any;
        bio: any;
        subscriptionHistory: {
            id: any;
            plan: any;
            startDate: any;
            endDate: any;
            status: string;
            amount: any;
        }[];
        behaviorStats: {
            loginFrequency: any;
            appUsageCount: any;
            avgSessionDuration: any;
            lastLoginIp: any;
        };
        projects: {
            id: any;
            name: any;
            description: any;
            status: any;
            createdAt: any;
            updatedAt: any;
            deployments: any;
            stars: any;
            forks: any;
            language: any;
            framework: any;
        }[];
        recentActivity: {
            id: any;
            action: any;
            details: any;
            timestamp: any;
        }[];
    }>;
    updateUserStatus(admin: AdminUser, id: string, dto: UpdateUserStatusDto): Promise<{
        success: boolean;
    }>;
    deleteUser(admin: AdminUser, id: string): Promise<void>;
    getSubscriptions(query: SubscriptionListQueryDto): Promise<{
        data: {
            id: any;
            userId: any;
            userName: any;
            userEmail: any;
            plan: string;
            startDate: any;
            renewalDate: any;
            paymentMethod: any;
            status: string;
            amount: any;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    cancelSubscription(admin: AdminUser, id: string, dto: CancelSubscriptionDto): Promise<{
        success: boolean;
    }>;
    getBehavior(): Promise<{
        dau: {
            date: string;
            value: number;
        }[];
        wau: {
            date: string;
            value: number;
        }[];
        featureUsage: {
            feature: string;
            count: number;
        }[];
        engagementHeatmap: {
            day: string;
            hour: number;
            value: number;
        }[];
        topUsers: {
            id: any;
            name: any;
            email: any;
            sessions: number;
            actions: any;
        }[];
    }>;
    getActivity(query: ActivityQueryDto): Promise<{
        id: any;
        admin: any;
        action: any;
        target: any;
        timestamp: any;
    }[]>;
    getGenerations(query: GenerationsQuery): Promise<{
        data: import("./admin-agent.service").GenerationRow[];
        total: number;
        page: number;
        limit: number;
    }>;
    getGenerationMetrics(): Promise<{
        total: number;
        completed: number;
        failed: number;
        avgDurationSeconds: number;
        workflowCounts: Record<string, number>;
        dailyTrend: {
            total: number;
            completed: number;
            failed: number;
            date: string;
        }[];
    }>;
    getQueueMetrics(): Promise<{
        counts: Record<string, number>;
        active: Array<{
            id?: string;
            userId: string;
            sandboxId: string;
            projectId?: string;
            progress: number;
        }>;
        waiting: Array<{
            id?: string;
            userId: string;
            sandboxId: string;
            projectId?: string;
            progress: number;
        }>;
    }>;
    getSandboxInventory(): Promise<{
        total: number;
        healthy: number;
        items: {
            sandboxId: string;
            createdAt: string;
            endAt: string;
            renewing: boolean;
            expiresInMinutes: number;
            healthy: boolean;
        }[];
    }>;
}
