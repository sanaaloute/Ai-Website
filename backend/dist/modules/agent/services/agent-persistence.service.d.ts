import { RunnableConfig } from '@langchain/core/runnables';
import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple, CheckpointListOptions, PendingWrite, ChannelVersions } from '@langchain/langgraph-checkpoint';
import { SupabaseService } from "../../../lib/supabase.service";
import type { AgentState } from '../state';
export declare class AgentPersistenceService extends BaseCheckpointSaver {
    private readonly supabase;
    private readonly logger;
    constructor(supabase: SupabaseService);
    private stripFileContents;
    private encode;
    private decode;
    private configKeys;
    getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined>;
    list(config: RunnableConfig, options?: CheckpointListOptions): AsyncGenerator<CheckpointTuple>;
    put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata, _newVersions: ChannelVersions): Promise<RunnableConfig>;
    putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void>;
    pruneCheckpoints(threadId: string, keepCount?: number): Promise<void>;
    deleteThread(threadId: string): Promise<void>;
    private loadPendingWrites;
    startGeneration(input: {
        userId: string;
        projectId?: string;
        threadId: string;
        prompt?: string;
        workflow?: string;
    }): Promise<string | null>;
    finishGeneration(input: {
        generationId?: string | null;
        threadId: string;
        status: 'completed' | 'failed' | 'cancelled';
        error?: string;
        summary?: string;
        previewUrl?: string;
        state?: Partial<AgentState>;
    }): Promise<void>;
    upsertMemory(input: {
        userId?: string;
        projectId?: string;
        memoryType: string;
        content: string;
        metadata?: Record<string, unknown>;
    }): Promise<void>;
    getMemories(input: {
        userId?: string;
        projectId?: string;
        memoryType?: string;
    }): Promise<Array<{
        id: string;
        memoryType: string;
        content: string;
        metadata?: Record<string, unknown>;
    }>>;
}
