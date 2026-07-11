import { SupabaseService } from "../../lib/supabase.service";
import { SandboxStateService } from "../../lib/sandbox-state.service";
import { E2BService } from "../../lib/e2b.service";
import { AgentJobService } from "../job-queue/agent-job.service";
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
export declare class AdminAgentService {
    private readonly supabase;
    private readonly agentJobService;
    private readonly sandboxState;
    private readonly e2b;
    private readonly logger;
    constructor(supabase: SupabaseService, agentJobService: AgentJobService, sandboxState: SandboxStateService, e2b: E2BService);
    getGenerations(query: GenerationsQuery): Promise<{
        data: GenerationRow[];
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
