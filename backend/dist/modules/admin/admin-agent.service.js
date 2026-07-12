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
var AdminAgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAgentService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../../lib/supabase.service");
const sandbox_state_service_1 = require("../../lib/sandbox-state.service");
const e2b_service_1 = require("../../lib/e2b.service");
const agent_job_service_1 = require("../job-queue/agent-job.service");
let AdminAgentService = AdminAgentService_1 = class AdminAgentService {
    constructor(supabase, agentJobService, sandboxState, e2b) {
        this.supabase = supabase;
        this.agentJobService = agentJobService;
        this.sandboxState = sandboxState;
        this.e2b = e2b;
        this.logger = new common_1.Logger(AdminAgentService_1.name);
    }
    async getGenerations(query) {
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(100, Math.max(1, query.limit ?? 20));
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        let dbQuery = this.supabase.admin
            .from('project_generations')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);
        if (query.status) {
            dbQuery = dbQuery.eq('status', query.status);
        }
        if (query.from) {
            dbQuery = dbQuery.gte('created_at', query.from);
        }
        if (query.to) {
            dbQuery = dbQuery.lte('created_at', query.to);
        }
        const { data, error, count } = await dbQuery;
        if (error) {
            this.logger.error(`getGenerations error: ${error.message}`);
            throw new Error(`Failed to fetch generations: ${error.message}`);
        }
        const rows = (data ?? []).map((r) => ({
            id: r.id,
            userId: r.user_id,
            projectId: r.project_id,
            threadId: r.thread_id,
            workflow: r.workflow,
            status: r.status,
            error: r.error,
            summary: r.summary,
            previewUrl: r.preview_url,
            startedAt: r.started_at,
            completedAt: r.completed_at,
            createdAt: r.created_at,
        }));
        return {
            data: rows,
            total: count ?? 0,
            page,
            limit,
        };
    }
    async getGenerationMetrics() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: rows, error } = await this.supabase.admin
            .from('project_generations')
            .select('status, workflow, started_at, completed_at, created_at')
            .gte('created_at', thirtyDaysAgo);
        if (error) {
            this.logger.error(`getGenerationMetrics error: ${error.message}`);
            throw new Error(`Failed to fetch generation metrics: ${error.message}`);
        }
        const total = rows?.length ?? 0;
        const completed = rows?.filter((r) => r.status === 'completed').length ?? 0;
        const failed = rows?.filter((r) => r.status === 'failed').length ?? 0;
        let totalDurationMs = 0;
        let completedCount = 0;
        for (const r of rows ?? []) {
            if (r.status === 'completed' && r.started_at && r.completed_at) {
                const duration = new Date(r.completed_at).getTime() - new Date(r.started_at).getTime();
                if (duration > 0) {
                    totalDurationMs += duration;
                    completedCount++;
                }
            }
        }
        const avgDurationSeconds = completedCount > 0 ? Math.round(totalDurationMs / completedCount / 1000) : 0;
        const workflowCounts = {};
        for (const r of rows ?? []) {
            const key = r.workflow || 'unknown';
            workflowCounts[key] = (workflowCounts[key] ?? 0) + 1;
        }
        const dailyCounts = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const key = d.toISOString().split('T')[0];
            dailyCounts[key] = { total: 0, completed: 0, failed: 0 };
        }
        for (const r of rows ?? []) {
            const key = new Date(r.created_at).toISOString().split('T')[0];
            if (!dailyCounts[key])
                continue;
            dailyCounts[key].total++;
            if (r.status === 'completed')
                dailyCounts[key].completed++;
            if (r.status === 'failed')
                dailyCounts[key].failed++;
        }
        return {
            total,
            completed,
            failed,
            avgDurationSeconds,
            workflowCounts,
            dailyTrend: Object.entries(dailyCounts).map(([date, values]) => ({ date, ...values })),
        };
    }
    async getQueueMetrics() {
        return this.agentJobService.getQueueMetrics();
    }
    async getSandboxInventory() {
        const infos = await this.sandboxState.listSandboxInfos();
        const now = Date.now();
        const items = await Promise.all(infos.map(async (entry) => {
            let healthy = false;
            try {
                const data = await this.e2b.ensureAlive(entry.sandboxId);
                healthy = !!data;
            }
            catch (e) {
                healthy = false;
            }
            const endAt = entry.info.endAt ? new Date(entry.info.endAt).getTime() : 0;
            const expiresInMinutes = endAt > now ? Math.round((endAt - now) / 60000) : 0;
            return {
                sandboxId: entry.sandboxId,
                createdAt: entry.info.createdAt,
                endAt: entry.info.endAt,
                renewing: entry.info.renewing ?? false,
                expiresInMinutes,
                healthy,
            };
        }));
        return {
            total: items.length,
            healthy: items.filter((i) => i.healthy).length,
            items,
        };
    }
};
exports.AdminAgentService = AdminAgentService;
exports.AdminAgentService = AdminAgentService = AdminAgentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        agent_job_service_1.AgentJobService,
        sandbox_state_service_1.SandboxStateService,
        e2b_service_1.E2BService])
], AdminAgentService);
//# sourceMappingURL=admin-agent.service.js.map