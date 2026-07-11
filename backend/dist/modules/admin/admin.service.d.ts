import { SupabaseService } from "../../lib/supabase.service";
import { StorageService } from "../../lib/storage.service";
import { AdminForgotPasswordDto, AdminLoginDto, AdminRegisterDto, AdminResetPasswordDto, CancelSubscriptionDto, UpdateUserStatusDto, UserListQueryDto, SubscriptionListQueryDto, ActivityQueryDto } from './dto';
import { AdminProfile, AdminUser } from './admin.types';
export declare class AdminService {
    private readonly supabase;
    private readonly storage;
    private readonly logger;
    constructor(supabase: SupabaseService, storage: StorageService);
    private signToken;
    private toProfile;
    logActivity(admin: AdminUser | null, action: string, target?: string, targetId?: string, details?: Record<string, unknown>): Promise<void>;
    register(dto: AdminRegisterDto, registrationSecret?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    login(dto: AdminLoginDto): Promise<{
        success: boolean;
        access_token: string;
        token_type: string;
        admin: AdminProfile;
        expires_in: number;
    }>;
    forgotPassword(dto: AdminForgotPasswordDto): Promise<Record<string, unknown>>;
    resetPassword(dto: AdminResetPasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
    getMe(admin: AdminUser): AdminProfile;
    private formatDate;
    private formatMonth;
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
    private computeMrr;
    private computeChurnRate;
    private percentChange;
    private buildDailyTrend;
    private buildMonthlyRevenue;
    private buildPlanDistribution;
    private buildUserStatusDistribution;
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
    private mapUserListItem;
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
    private emptyDailyTrend;
    private emptyHeatmap;
    private buildDailyMetric;
    private buildWeeklyMetric;
    private buildHeatmap;
    getActivityLogs(query: ActivityQueryDto): Promise<{
        id: any;
        admin: any;
        action: any;
        target: any;
        timestamp: any;
    }[]>;
}
