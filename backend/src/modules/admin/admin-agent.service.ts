import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '@/lib/supabase.service';
import { SandboxStateService } from '@/lib/sandbox-state.service';
import { E2BService } from '@/lib/e2b.service';
import { AgentJobService } from '@/modules/job-queue/agent-job.service';

export interface GenerationsQuery {
  page?: number;
  limit?: number;
  status?: string;
  from?: string;
  to?: string;
}

export interface GenerationRow {
  id: string;
  userId: string;
  projectId?: string | null;
  threadId: string;
  workflow?: string | null;
  status: string;
  error?: string | null;
  summary?: string | null;
  previewUrl?: string | null;
  startedAt: string;
  completedAt?: string | null;
  createdAt: string;
}

@Injectable()
export class AdminAgentService {
  private readonly logger = new Logger(AdminAgentService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly agentJobService: AgentJobService,
    private readonly sandboxState: SandboxStateService,
    private readonly e2b: E2BService,
  ) {}

  async getGenerations(query: GenerationsQuery) {
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

    const rows: GenerationRow[] = (data ?? []).map((r) => ({
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

    const workflowCounts: Record<string, number> = {};
    for (const r of rows ?? []) {
      const key = r.workflow || 'unknown';
      workflowCounts[key] = (workflowCounts[key] ?? 0) + 1;
    }

    const dailyCounts: Record<string, { total: number; completed: number; failed: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyCounts[key] = { total: 0, completed: 0, failed: 0 };
    }
    for (const r of rows ?? []) {
      const key = new Date(r.created_at).toISOString().split('T')[0];
      if (!dailyCounts[key]) continue;
      dailyCounts[key].total++;
      if (r.status === 'completed') dailyCounts[key].completed++;
      if (r.status === 'failed') dailyCounts[key].failed++;
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

    const items = await Promise.all(
      infos.map(async (entry) => {
        let healthy = false;
        try {
          const data = await this.e2b.ensureAlive(entry.sandboxId);
          healthy = !!data;
        } catch (e) {
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
      }),
    );

    return {
      total: items.length,
      healthy: items.filter((i) => i.healthy).length,
      items,
    };
  }
}
