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
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const bcryptjs_1 = require("bcryptjs");
const jsonwebtoken_1 = require("jsonwebtoken");
const crypto_1 = require("crypto");
const env_1 = require("../../config/env");
const supabase_service_1 = require("../../lib/supabase.service");
const storage_service_1 = require("../../lib/storage.service");
const paddle_service_1 = require("../../lib/paddle.service");
let AdminService = AdminService_1 = class AdminService {
    constructor(supabase, storage, paddle) {
        this.supabase = supabase;
        this.storage = storage;
        this.paddle = paddle;
        this.logger = new common_1.Logger(AdminService_1.name);
    }
    signToken(payload) {
        const e = (0, env_1.env)();
        return (0, jsonwebtoken_1.sign)(payload, e.adminJwtSecret, {
            algorithm: e.adminJwtAlgorithm,
            expiresIn: `${e.adminJwtExpiryMinutes}m`,
        });
    }
    toProfile(admin) {
        return {
            id: admin.id,
            email: admin.email,
            full_name: admin.full_name ?? '',
            role: admin.role,
        };
    }
    async logActivity(admin, action, target, targetId, details) {
        try {
            const { error } = await this.supabase.admin.from('admin_activity_logs').insert({
                id: (0, crypto_1.randomUUID)(),
                admin_id: admin?.id ?? null,
                admin_email: admin?.email ?? null,
                action,
                target,
                target_id: targetId,
                details,
                created_at: new Date().toISOString(),
            });
            if (error) {
                this.logger.error(`Failed to log activity: ${error.message}`);
            }
        }
        catch (err) {
            this.logger.error(`Failed to log activity: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    async register(dto, registrationSecret) {
        const e = (0, env_1.env)();
        const { count: existingCount, error: countError } = await this.supabase.admin
            .from('admin_users')
            .select('*', { count: 'exact', head: true });
        if (countError) {
            throw new common_1.HttpException({ success: false, error: 'Unable to verify admin registration state' }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        const isFirst = (existingCount ?? 0) === 0;
        if (!isFirst) {
            if (!e.adminRegistrationSecret) {
                throw new common_1.HttpException({
                    success: false,
                    error: 'Admin registration is disabled. Set ADMIN_REGISTRATION_SECRET to enable.',
                }, common_1.HttpStatus.FORBIDDEN);
            }
            if (registrationSecret !== e.adminRegistrationSecret) {
                throw new common_1.HttpException({ success: false, error: 'Invalid admin registration secret.' }, common_1.HttpStatus.FORBIDDEN);
            }
        }
        const { data: existing } = await this.supabase.admin
            .from('admin_users')
            .select('id')
            .eq('email', dto.email)
            .single();
        if (existing) {
            throw new common_1.HttpException({ success: false, error: 'An admin with this email already exists.' }, common_1.HttpStatus.CONFLICT);
        }
        const passwordHash = (0, bcryptjs_1.hashSync)(dto.password, 12);
        const { error } = await this.supabase.admin.from('admin_users').insert({
            id: (0, crypto_1.randomUUID)(),
            email: dto.email,
            password_hash: passwordHash,
            full_name: dto.full_name,
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        if (error) {
            this.logger.error(`Admin registration failed: ${error.message}`);
            throw new common_1.HttpException({ success: false, error: 'Failed to create admin account' }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return { success: true, message: 'Admin account created successfully.' };
    }
    async login(dto) {
        const e = (0, env_1.env)();
        const { data: admin, error } = await this.supabase.admin
            .from('admin_users')
            .select('*')
            .eq('email', dto.email)
            .single();
        if (error || !admin || !(0, bcryptjs_1.compareSync)(dto.password, admin.password_hash)) {
            throw new common_1.HttpException({ success: false, error: 'Invalid email or password.' }, common_1.HttpStatus.UNAUTHORIZED);
        }
        const accessToken = this.signToken({
            sub: admin.id,
            email: admin.email,
            role: admin.role,
        });
        return {
            success: true,
            access_token: accessToken,
            token_type: 'Bearer',
            admin: this.toProfile(admin),
            expires_in: e.adminJwtExpiryMinutes * 60,
        };
    }
    async forgotPassword(dto) {
        const { data: admin } = await this.supabase.admin
            .from('admin_users')
            .select('id, email')
            .eq('email', dto.email)
            .single();
        const response = {
            success: true,
            message: 'If the email exists, reset instructions have been sent.',
        };
        if (admin) {
            const token = (0, crypto_1.randomBytes)(32).toString('hex');
            const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
            await this.supabase.admin
                .from('admin_users')
                .update({ reset_token: token, reset_token_expires_at: expiresAt })
                .eq('id', admin.id);
            if ((0, env_1.env)().nodeEnv === 'development') {
                response.reset_token = token;
            }
        }
        return response;
    }
    async resetPassword(dto) {
        const { data: admin, error } = await this.supabase.admin
            .from('admin_users')
            .select('*')
            .eq('reset_token', dto.token)
            .single();
        if (error || !admin) {
            throw new common_1.HttpException({ success: false, error: 'Invalid or expired reset token.' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const expiresAt = new Date(admin.reset_token_expires_at);
        if (isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
            throw new common_1.HttpException({ success: false, error: 'Invalid or expired reset token.' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const passwordHash = (0, bcryptjs_1.hashSync)(dto.new_password, 12);
        const { error: updateError } = await this.supabase.admin
            .from('admin_users')
            .update({
            password_hash: passwordHash,
            reset_token: null,
            reset_token_expires_at: null,
            updated_at: new Date().toISOString(),
        })
            .eq('id', admin.id);
        if (updateError) {
            throw new common_1.HttpException({ success: false, error: 'Failed to reset password' }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return { success: true, message: 'Password reset successfully.' };
    }
    getMe(admin) {
        return this.toProfile(admin);
    }
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    formatMonth(date) {
        return date.toISOString().slice(0, 7);
    }
    async getStats() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const { count: totalUsers, error: usersErr } = await this.supabase.admin
            .from('users')
            .select('*', { count: 'exact', head: true });
        if (usersErr)
            this.logger.warn(`stats users count error: ${usersErr.message}`);
        const { count: totalUsersPrev } = await this.supabase.admin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .lt('created_at', thirtyDaysAgo.toISOString());
        const { count: activeSubscriptions, error: subErr } = await this.supabase.admin
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        if (subErr)
            this.logger.warn(`stats subscriptions count error: ${subErr.message}`);
        const { count: activeSubscriptionsPrev } = await this.supabase.admin
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
            .lt('created_at', thirtyDaysAgo.toISOString());
        const { data: allSubs } = await this.supabase.admin.from('subscriptions').select('plan, status, amount, billing_interval');
        const mrr = this.computeMrr(allSubs ?? []);
        const mrrPrev = 0;
        const churnRate = this.computeChurnRate(allSubs ?? []);
        const churnRatePrev = 0;
        const { data: usersTrend } = await this.supabase.admin
            .from('users')
            .select('created_at')
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: true });
        const signupsTrend = this.buildDailyTrend(usersTrend ?? [], thirtyDaysAgo, now, 'created_at');
        const { data: revenueSubs } = await this.supabase.admin
            .from('subscriptions')
            .select('created_at, amount')
            .gte('created_at', new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString());
        const revenueTrend = this.buildMonthlyRevenue(revenueSubs ?? []);
        const planDistribution = this.buildPlanDistribution(allSubs ?? []);
        const userStatusDistribution = await this.buildUserStatusDistribution();
        return {
            totalUsers: totalUsers ?? 0,
            totalUsersChange: this.percentChange(totalUsers ?? 0, totalUsersPrev ?? 0),
            activeSubscriptions: activeSubscriptions ?? 0,
            activeSubscriptionsChange: this.percentChange(activeSubscriptions ?? 0, activeSubscriptionsPrev ?? 0),
            mrr,
            mrrChange: this.percentChange(mrr, mrrPrev),
            churnRate,
            churnRateChange: churnRate - churnRatePrev,
            signupsTrend,
            revenueTrend,
            planDistribution,
            userStatusDistribution,
        };
    }
    computeMrr(subs) {
        let total = 0;
        for (const sub of subs) {
            if (sub.status !== 'active')
                continue;
            const amount = Number(sub.amount ?? 0);
            const interval = String(sub.billing_interval ?? 'month').toLowerCase();
            if (interval === 'year' || interval === 'yearly') {
                total += amount / 12;
            }
            else if (interval === 'month' || interval === 'monthly') {
                total += amount;
            }
            else {
                total += amount;
            }
        }
        return Math.round(total);
    }
    computeChurnRate(subs) {
        const total = subs.length;
        if (total === 0)
            return 0;
        const canceled = subs.filter((s) => String(s.status).toLowerCase() === 'canceled').length;
        return Math.round((canceled / total) * 1000) / 10;
    }
    percentChange(current, previous) {
        if (previous === 0)
            return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 1000) / 10;
    }
    buildDailyTrend(rows, start, end, dateField) {
        const counts = {};
        for (const row of rows) {
            const date = new Date(String(row[dateField]));
            if (isNaN(date.getTime()))
                continue;
            const key = this.formatDate(date);
            counts[key] = (counts[key] ?? 0) + 1;
        }
        const result = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const key = this.formatDate(new Date(d));
            result.push({ date: key, value: counts[key] ?? 0 });
        }
        return result;
    }
    buildMonthlyRevenue(subs) {
        const counts = {};
        for (const sub of subs) {
            const date = new Date(String(sub.created_at));
            if (isNaN(date.getTime()))
                continue;
            const key = this.formatMonth(date);
            counts[key] = (counts[key] ?? 0) + Number(sub.amount ?? 0);
        }
        return Object.entries(counts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, value]) => ({ date, value }));
    }
    buildPlanDistribution(subs) {
        const counts = {};
        for (const sub of subs) {
            const plan = String(sub.plan ?? 'Unknown').replace(/^\w/, (c) => c.toUpperCase());
            counts[plan] = (counts[plan] ?? 0) + 1;
        }
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }
    async buildUserStatusDistribution() {
        const { data: rows, error } = await this.supabase.admin.from('users').select('status');
        if (error || !rows) {
            return [
                { name: 'Active', value: 0 },
                { name: 'Inactive', value: 0 },
                { name: 'Suspended', value: 0 },
            ];
        }
        const counts = { Active: 0, Inactive: 0, Suspended: 0 };
        for (const row of rows) {
            const status = String(row.status ?? 'Active').replace(/^\w/, (c) => c.toUpperCase());
            counts[status] = (counts[status] ?? 0) + 1;
        }
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }
    async getUsers(query) {
        const { page, limit, search, status } = query;
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        let dbQuery = this.supabase.admin.from('users').select('*', { count: 'exact' });
        if (status) {
            dbQuery = dbQuery.ilike('status', status);
        }
        if (search) {
            dbQuery = dbQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
        }
        const { data, error, count } = await dbQuery.order('created_at', { ascending: false }).range(from, to);
        if (error) {
            throw new common_1.HttpException({ success: false, error: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        const users = (data ?? []).map((u) => this.mapUserListItem(u));
        return {
            data: users,
            total: count ?? 0,
            page,
            limit,
        };
    }
    mapUserListItem(u) {
        return {
            id: u.id,
            name: u.full_name ?? u.email,
            email: u.email,
            avatar: u.avatar_url ?? null,
            plan: u.subscription_type ?? 'Basic',
            status: u.status ?? 'Active',
            joinDate: u.created_at,
            lastActive: u.updated_at ?? u.last_active ?? u.created_at,
            loginFrequency: u.login_frequency ?? 0,
            appUsageCount: u.app_usage_count ?? 0,
        };
    }
    async getUserById(id) {
        const { data: user, error } = await this.supabase.admin.from('users').select('*').eq('id', id).single();
        if (error || !user) {
            throw new common_1.HttpException({ error: 'User not found' }, common_1.HttpStatus.NOT_FOUND);
        }
        const [{ data: subscriptions }, { data: projects }, { data: recentActivity }, { data: behavior }] = await Promise.all([
            this.supabase.admin.from('subscriptions').select('*').eq('user_id', id).order('created_at', { ascending: false }),
            this.supabase.admin.from('projects').select('*').eq('user_id', id).order('updated_at', { ascending: false }),
            this.supabase.admin.from('admin_activity_logs').select('*').eq('target_id', id).order('created_at', { ascending: false }).limit(10),
            this.supabase.admin.from('user_sessions').select('*').eq('user_id', id).order('started_at', { ascending: false }).limit(1).single(),
        ]);
        return {
            id: user.id,
            name: user.full_name ?? user.email,
            email: user.email,
            avatar: user.avatar_url ?? null,
            plan: user.subscription_type ?? 'Basic',
            status: user.status ?? 'Active',
            joinDate: user.created_at,
            lastActive: user.updated_at ?? user.last_active ?? user.created_at,
            phone: user.phone ?? null,
            company: user.company ?? null,
            location: user.location ?? null,
            role: user.role ?? null,
            bio: user.bio ?? null,
            subscriptionHistory: (subscriptions ?? []).map((s) => ({
                id: s.id,
                plan: s.plan ?? 'Basic',
                startDate: s.created_at,
                endDate: s.current_period_end ?? null,
                status: String(s.status ?? 'Unknown').replace(/^\w/, (c) => c.toUpperCase()),
                amount: s.amount ?? 0,
            })),
            behaviorStats: {
                loginFrequency: user.login_frequency ?? 0,
                appUsageCount: user.app_usage_count ?? 0,
                avgSessionDuration: behavior?.duration_seconds ?? 0,
                lastLoginIp: behavior?.ip_address ?? null,
            },
            projects: (projects ?? []).map((p) => ({
                id: p.id,
                name: p.name,
                description: p.description ?? null,
                status: p.status ?? 'Draft',
                createdAt: p.created_at,
                updatedAt: p.updated_at,
                deployments: p.deployments_count ?? 0,
                stars: p.stars ?? 0,
                forks: p.forks ?? 0,
                language: p.language ?? 'TypeScript',
                framework: p.framework ?? 'Next.js',
            })),
            recentActivity: [
                ...(recentActivity ?? []).map((a) => ({
                    id: a.id,
                    action: a.action,
                    details: a.target ?? '',
                    timestamp: a.created_at,
                })),
                ...(projects ?? [])
                    .slice(0, 5)
                    .map((p) => ({
                    id: p.id,
                    action: 'Created project',
                    details: `Performed on ${p.name}`,
                    timestamp: p.created_at,
                })),
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        };
    }
    async updateUserStatus(admin, id, dto) {
        const { data: existing } = await this.supabase.admin.from('users').select('id, status').eq('id', id).single();
        if (!existing) {
            throw new common_1.HttpException({ error: 'User not found' }, common_1.HttpStatus.NOT_FOUND);
        }
        const { error } = await this.supabase.admin
            .from('users')
            .update({ status: dto.status, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) {
            throw new common_1.HttpException({ success: false, error: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        await this.logActivity(admin, `updated user status to ${dto.status}`, `User #${id}`, id, {
            previousStatus: existing.status,
            newStatus: dto.status,
        });
        return { success: true };
    }
    async deleteUser(admin, id) {
        const { data: existing } = await this.supabase.admin.from('users').select('id').eq('id', id).single();
        if (!existing) {
            throw new common_1.HttpException({ error: 'User not found' }, common_1.HttpStatus.NOT_FOUND);
        }
        await this.storage.deleteUserFiles(id);
        await Promise.all([
            this.supabase.admin.from('projects').delete().eq('user_id', id),
            this.supabase.admin.from('subscriptions').delete().eq('user_id', id),
            this.supabase.admin.from('customers').delete().eq('user_id', id),
        ]);
        const { error } = await this.supabase.admin.from('users').delete().eq('id', id);
        if (error) {
            throw new common_1.HttpException({ success: false, error: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        const { error: authError } = await this.supabase.admin.auth.admin.deleteUser(id);
        if (authError) {
            this.logger.error(`Failed to delete Supabase auth user ${id}: ${authError.message}`);
            throw new common_1.HttpException({ success: false, error: 'Failed to delete auth user' }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        await this.logActivity(admin, 'deleted user', `User #${id}`, id);
    }
    async getSubscriptions(query) {
        const { page, limit, plan, status } = query;
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        let dbQuery = this.supabase.admin.from('subscriptions').select('*', { count: 'exact' });
        if (plan) {
            dbQuery = dbQuery.ilike('plan', plan);
        }
        if (status) {
            dbQuery = dbQuery.ilike('status', status);
        }
        const { data, error, count } = await dbQuery.order('created_at', { ascending: false }).range(from, to);
        if (error) {
            throw new common_1.HttpException({ success: false, error: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        const enriched = await Promise.all((data ?? []).map(async (sub) => {
            const { data: user } = await this.supabase.admin
                .from('users')
                .select('full_name, email')
                .eq('id', sub.user_id)
                .single();
            return {
                id: sub.id,
                userId: sub.user_id,
                userName: user?.full_name ?? user?.email ?? 'Unknown',
                userEmail: user?.email ?? 'Unknown',
                plan: sub.plan ?? 'Basic',
                startDate: sub.created_at,
                renewalDate: sub.current_period_end ?? null,
                paymentMethod: sub.payment_method ?? 'Unknown',
                status: String(sub.status ?? 'Unknown').replace(/^\w/, (c) => c.toUpperCase()),
                amount: sub.amount ?? 0,
            };
        }));
        return {
            data: enriched,
            total: count ?? 0,
            page,
            limit,
        };
    }
    async cancelSubscription(admin, id, dto) {
        const { data: existing } = await this.supabase.admin.from('subscriptions').select('*').eq('id', id).single();
        if (!existing) {
            throw new common_1.HttpException({ error: 'Subscription not found' }, common_1.HttpStatus.NOT_FOUND);
        }
        if (existing.paddle_subscription_id && this.paddle.configured) {
            try {
                await this.paddle.cancelSubscription(existing.paddle_subscription_id);
            }
            catch (err) {
                this.logger.error(`Failed to cancel Paddle subscription ${existing.paddle_subscription_id}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        const { error } = await this.supabase.admin
            .from('subscriptions')
            .update({
            status: 'canceled',
            cancellation_reason: dto.reason,
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', id);
        if (error) {
            throw new common_1.HttpException({ success: false, error: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        await this.logActivity(admin, 'canceled subscription', `Subscription #${id}`, id, { reason: dto.reason });
        return { success: true };
    }
    async getBehavior() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        try {
            const [{ data: sessions }, { data: events }, { data: topUsersRaw }] = await Promise.all([
                this.supabase.admin.from('user_sessions').select('*').gte('started_at', thirtyDaysAgo.toISOString()),
                this.supabase.admin.from('user_events').select('*').gte('created_at', thirtyDaysAgo.toISOString()),
                this.supabase.admin
                    .from('user_sessions')
                    .select('user_id, actions_count, duration_seconds')
                    .order('actions_count', { ascending: false })
                    .limit(10),
            ]);
            const dau = this.buildDailyMetric(sessions ?? [], 'started_at', () => true);
            const wau = this.buildWeeklyMetric(sessions ?? [], 'started_at');
            const featureCounts = {};
            for (const event of events ?? []) {
                const feature = String(event.feature ?? 'Unknown');
                featureCounts[feature] = (featureCounts[feature] ?? 0) + 1;
            }
            const featureUsage = Object.entries(featureCounts).map(([feature, count]) => ({ feature, count }));
            const engagementHeatmap = this.buildHeatmap(sessions ?? []);
            const topUsers = await Promise.all((topUsersRaw ?? []).map(async (u) => {
                const { data: user } = await this.supabase.admin
                    .from('users')
                    .select('full_name, email')
                    .eq('id', u.user_id)
                    .single();
                return {
                    id: u.user_id,
                    name: user?.full_name ?? user?.email ?? 'Unknown',
                    email: user?.email ?? 'Unknown',
                    sessions: 1,
                    actions: u.actions_count ?? 0,
                };
            }));
            return { dau, wau, featureUsage, engagementHeatmap, topUsers };
        }
        catch (err) {
            this.logger.warn(`Behavior analytics tables not ready: ${err instanceof Error ? err.message : String(err)}`);
            return {
                dau: this.emptyDailyTrend(),
                wau: this.emptyDailyTrend(),
                featureUsage: [],
                engagementHeatmap: this.emptyHeatmap(),
                topUsers: [],
            };
        }
    }
    emptyDailyTrend() {
        const result = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            result.push({ date: this.formatDate(d), value: 0 });
        }
        return result;
    }
    emptyHeatmap() {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const cells = [];
        for (const day of days) {
            for (let hour = 0; hour < 24; hour++) {
                cells.push({ day, hour, value: 0 });
            }
        }
        return cells;
    }
    buildDailyMetric(rows, dateField, filter) {
        const counts = {};
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            counts[this.formatDate(d)] = 0;
        }
        for (const row of rows) {
            if (!filter(row))
                continue;
            const date = new Date(String(row[dateField]));
            if (isNaN(date.getTime()))
                continue;
            const key = this.formatDate(date);
            if (key in counts)
                counts[key]++;
        }
        return Object.entries(counts).map(([date, value]) => ({ date, value }));
    }
    buildWeeklyMetric(rows, dateField) {
        const counts = {};
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            counts[this.formatDate(d)] = new Set();
        }
        for (const row of rows) {
            const date = new Date(String(row[dateField]));
            if (isNaN(date.getTime()))
                continue;
            const key = this.formatDate(date);
            if (key in counts)
                counts[key].add(String(row.user_id));
        }
        return Object.entries(counts).map(([date, value]) => ({ date, value: value.size }));
    }
    buildHeatmap(sessions) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const jsDayToApiDay = {
            0: 'Sun',
            1: 'Mon',
            2: 'Tue',
            3: 'Wed',
            4: 'Thu',
            5: 'Fri',
            6: 'Sat',
        };
        const cells = [];
        for (const day of days) {
            for (let hour = 0; hour < 24; hour++) {
                cells.push({ day, hour, value: 0 });
            }
        }
        for (const session of sessions) {
            const date = new Date(String(session.started_at));
            if (isNaN(date.getTime()))
                continue;
            const day = jsDayToApiDay[date.getUTCDay()];
            const hour = date.getUTCHours();
            const cell = cells.find((c) => c.day === day && c.hour === hour);
            if (cell)
                cell.value += 1;
        }
        return cells;
    }
    async getActivityLogs(query) {
        try {
            const { data, error } = await this.supabase.admin
                .from('admin_activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(query.limit);
            if (error) {
                this.logger.warn(`admin_activity_logs query error: ${error.message}`);
                return [];
            }
            return (data ?? []).map((log) => ({
                id: log.id,
                admin: log.admin_email ?? 'system',
                action: log.action,
                target: log.target ?? '',
                timestamp: log.created_at,
            }));
        }
        catch (err) {
            this.logger.warn(`admin_activity_logs table not ready: ${err instanceof Error ? err.message : String(err)}`);
            return [];
        }
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        storage_service_1.StorageService,
        paddle_service_1.PaddleService])
], AdminService);
//# sourceMappingURL=admin.service.js.map