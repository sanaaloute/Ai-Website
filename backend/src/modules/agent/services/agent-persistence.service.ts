import { Injectable, Logger } from '@nestjs/common';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  BaseCheckpointSaver,
  Checkpoint,
  CheckpointMetadata,
  CheckpointTuple,
  CheckpointListOptions,
  PendingWrite,
  ChannelVersions,
} from '@langchain/langgraph-checkpoint';
import { SupabaseService } from '@/lib/supabase.service';
import type { AgentState } from '../state';

interface EncodedBlob {
  type: string;
  data: string; // base64
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(base64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}

@Injectable()
export class AgentPersistenceService extends BaseCheckpointSaver {
  private readonly logger = new Logger(AgentPersistenceService.name);

  constructor(private readonly supabase: SupabaseService) {
    super();
  }

  private stripFileContents(checkpoint: Checkpoint): Checkpoint {
    const channelValues = checkpoint.channel_values as Record<string, unknown> | undefined;
    if (!channelValues?.filesWritten) return checkpoint;

    const filesWritten = channelValues.filesWritten as Array<{ content?: string; error?: string; path: string; status: string }>;
    return {
      ...checkpoint,
      channel_values: {
        ...channelValues,
        filesWritten: filesWritten.map((fw) => ({
          path: fw.path,
          status: fw.status,
          error: fw.error,
          // content intentionally omitted
        })),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Serialization helpers
  // ---------------------------------------------------------------------------
  private async encode(value: unknown): Promise<string> {
    const [type, bytes] = await this.serde.dumpsTyped(value);
    const blob: EncodedBlob = { type, data: toBase64(bytes) };
    return JSON.stringify(blob);
  }

  private async decode(encoded: string): Promise<unknown> {
    const blob = JSON.parse(encoded) as EncodedBlob;
    return this.serde.loadsTyped(blob.type, fromBase64(blob.data));
  }

  private configKeys(config: RunnableConfig): {
    threadId: string | undefined;
    checkpointNs: string;
    checkpointId: string | undefined;
  } {
    return {
      threadId: config.configurable?.thread_id as string | undefined,
      checkpointNs: (config.configurable?.checkpoint_ns as string) ?? '',
      checkpointId: (config.configurable?.checkpoint_id as string) ?? undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // BaseCheckpointSaver implementation
  // ---------------------------------------------------------------------------
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const { threadId, checkpointNs, checkpointId } = this.configKeys(config);
    if (!threadId) return undefined;

    let query = this.supabase.admin
      .from('agent_checkpoints')
      .select('checkpoint_id, parent_checkpoint_id, checkpoint, metadata')
      .eq('thread_id', threadId)
      .eq('checkpoint_ns', checkpointNs);

    if (checkpointId) {
      query = query.eq('checkpoint_id', checkpointId);
    } else {
      query = query.order('created_at', { ascending: false }).limit(1);
    }

    const { data, error } = await query;
    if (error) {
      this.logger.error(`getTuple query error: ${error.message}`);
      return undefined;
    }
    if (!data || data.length === 0) return undefined;

    const row = data[0];
    const resolvedCheckpointId = row.checkpoint_id as string;

    const [checkpoint, metadata, pendingWrites] = await Promise.all([
      this.decode(row.checkpoint as string) as Promise<Checkpoint>,
      row.metadata ? (this.decode(row.metadata as string) as Promise<CheckpointMetadata>) : Promise.resolve(undefined),
      this.loadPendingWrites(threadId, checkpointNs, resolvedCheckpointId),
    ]);

    const tuple: CheckpointTuple = {
      config: {
        configurable: {
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: resolvedCheckpointId,
        },
      },
      checkpoint,
      metadata,
      pendingWrites,
    };

    if (row.parent_checkpoint_id) {
      tuple.parentConfig = {
        configurable: {
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: row.parent_checkpoint_id as string,
        },
      };
    }

    return tuple;
  }

  async *list(
    config: RunnableConfig,
    options?: CheckpointListOptions,
  ): AsyncGenerator<CheckpointTuple> {
    const { threadId, checkpointNs, checkpointId } = this.configKeys(config);
    const beforeCheckpointId = options?.before?.configurable?.checkpoint_id as string | undefined;

    let query = this.supabase.admin
      .from('agent_checkpoints')
      .select('thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, checkpoint, metadata, created_at');

    if (threadId) query = query.eq('thread_id', threadId);
    if (checkpointNs !== undefined) query = query.eq('checkpoint_ns', checkpointNs);
    if (checkpointId) query = query.eq('checkpoint_id', checkpointId);
    if (beforeCheckpointId) query = query.lt('checkpoint_id', beforeCheckpointId);

    query = query.order('created_at', { ascending: false });
    query = query.limit(options?.limit ?? 100);

    const { data, error } = await query;
    if (error) {
      this.logger.error(`list query error: ${error.message}`);
      return;
    }
    if (!data) return;

    for (const row of data) {
      const [checkpoint, metadata, pendingWrites] = await Promise.all([
        this.decode(row.checkpoint as string) as Promise<Checkpoint>,
        row.metadata ? (this.decode(row.metadata as string) as Promise<CheckpointMetadata>) : Promise.resolve(undefined),
        this.loadPendingWrites(
          row.thread_id as string,
          row.checkpoint_ns as string,
          row.checkpoint_id as string,
        ),
      ]);

      const tuple: CheckpointTuple = {
        config: {
          configurable: {
            thread_id: row.thread_id as string,
            checkpoint_ns: row.checkpoint_ns as string,
            checkpoint_id: row.checkpoint_id as string,
          },
        },
        checkpoint,
        metadata,
        pendingWrites,
      };

      if (row.parent_checkpoint_id) {
        tuple.parentConfig = {
          configurable: {
            thread_id: row.thread_id as string,
            checkpoint_ns: row.checkpoint_ns as string,
            checkpoint_id: row.parent_checkpoint_id as string,
          },
        };
      }

      yield tuple;
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    _newVersions: ChannelVersions,
  ): Promise<RunnableConfig> {
    const { threadId, checkpointNs } = this.configKeys(config);
    if (!threadId) {
      throw new Error(
        'Failed to put checkpoint. The passed RunnableConfig is missing a required "thread_id" field in its "configurable" property.',
      );
    }

    // File contents are already written to the sandbox and emitted as file_delta
    // events, so we strip them from checkpoints to avoid multi-megabyte blobs.
    const checkpointToSave = this.stripFileContents(checkpoint);

    const [checkpointBlob, metadataBlob] = await Promise.all([
      this.encode(checkpointToSave),
      this.encode(metadata),
    ]);

    const { error } = await this.supabase.admin.from('agent_checkpoints').upsert(
      {
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        checkpoint_id: checkpoint.id,
        parent_checkpoint_id: config.configurable?.checkpoint_id as string | undefined,
        checkpoint: checkpointBlob,
        metadata: metadataBlob,
      },
      { onConflict: 'thread_id,checkpoint_ns,checkpoint_id' },
    );

    if (error) {
      this.logger.error(`put checkpoint error: ${error.message}`);
      // Continue the run in-memory rather than killing the whole generation.
      // The run will still work; it just won't be resumable from this checkpoint.
      return {
        configurable: {
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: checkpoint.id,
        },
      };
    }

    return {
      configurable: {
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        checkpoint_id: checkpoint.id,
      },
    };
  }

  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
    const { threadId, checkpointNs, checkpointId } = this.configKeys(config);
    if (!threadId || !checkpointId) {
      this.logger.warn('putWrites called without thread_id or checkpoint_id; skipping.');
      return;
    }

    const rows = await Promise.all(
      writes.map(async (write, idx) => {
        const [channel, value] = write;
        const encoded = value === undefined ? null : await this.encode(value);
        return {
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: checkpointId,
          task_id: taskId,
          idx,
          channel: channel as string,
          value: encoded,
        };
      }),
    );

    const { error } = await this.supabase.admin.from('agent_writes').upsert(rows, {
      onConflict: 'thread_id,checkpoint_ns,checkpoint_id,task_id,idx',
    });

    if (error) {
      this.logger.error(`putWrites error: ${error.message}`);
    }
  }

  async pruneCheckpoints(threadId: string, keepCount = 20): Promise<void> {
    const { data, error: listError } = await this.supabase.admin
      .from('agent_checkpoints')
      .select('checkpoint_id')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .range(keepCount, 1_000_000);

    if (listError) {
      this.logger.error(`pruneCheckpoints list error: ${listError.message}`);
      return;
    }

    if (!data?.length) return;

    const idsToDelete = data.map((row) => row.checkpoint_id as string);
    const { error: writesError } = await this.supabase.admin
      .from('agent_writes')
      .delete()
      .eq('thread_id', threadId)
      .in('checkpoint_id', idsToDelete);
    if (writesError) {
      this.logger.error(`pruneCheckpoints writes delete error: ${writesError.message}`);
    }

    const { error: checkpointsError } = await this.supabase.admin
      .from('agent_checkpoints')
      .delete()
      .eq('thread_id', threadId)
      .in('checkpoint_id', idsToDelete);
    if (checkpointsError) {
      this.logger.error(`pruneCheckpoints checkpoints delete error: ${checkpointsError.message}`);
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    const { error: writesError } = await this.supabase.admin
      .from('agent_writes')
      .delete()
      .eq('thread_id', threadId);
    if (writesError) {
      this.logger.error(`deleteThread writes error: ${writesError.message}`);
    }

    const { error: checkpointsError } = await this.supabase.admin
      .from('agent_checkpoints')
      .delete()
      .eq('thread_id', threadId);
    if (checkpointsError) {
      this.logger.error(`deleteThread checkpoints error: ${checkpointsError.message}`);
    }
  }

  private async loadPendingWrites(
    threadId: string,
    checkpointNs: string,
    checkpointId: string,
  ): Promise<NonNullable<CheckpointTuple['pendingWrites']>> {
    const { data, error } = await this.supabase.admin
      .from('agent_writes')
      .select('task_id, channel, value')
      .eq('thread_id', threadId)
      .eq('checkpoint_ns', checkpointNs)
      .eq('checkpoint_id', checkpointId)
      .order('idx', { ascending: true });

    if (error) {
      this.logger.error(`loadPendingWrites error: ${error.message}`);
      return [];
    }

    if (!data) return [];

    return Promise.all(
      data.map(async (row) => {
        const value = row.value ? await this.decode(row.value as string) : undefined;
        return [row.task_id as string, row.channel as string, value] as [string, string, unknown];
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Generation logging
  // ---------------------------------------------------------------------------
  async startGeneration(input: {
    userId: string;
    projectId?: string;
    threadId: string;
    prompt?: string;
    workflow?: string;
  }): Promise<string | null> {
    const { data, error } = await this.supabase.admin.from('project_generations').insert({
      user_id: input.userId,
      project_id: input.projectId ?? null,
      thread_id: input.threadId,
      prompt: input.prompt ?? null,
      workflow: input.workflow ?? null,
      status: 'started',
      started_at: new Date().toISOString(),
    });
    if (error) {
      this.logger.error(`startGeneration error: ${error.message}`);
      return null;
    }
    return (data as unknown as { id: string }[])?.[0]?.id ?? null;
  }

  async finishGeneration(input: {
    generationId?: string | null;
    threadId: string;
    status: 'completed' | 'failed';
    error?: string;
    summary?: string;
    previewUrl?: string;
    state?: Partial<AgentState>;
  }): Promise<void> {
    let updateQuery = this.supabase.admin.from('project_generations').update({
        status: input.status,
        error: input.error ?? null,
        summary: input.summary ?? null,
        preview_url: input.previewUrl ?? null,
        completed_at: new Date().toISOString(),
      });
    updateQuery = input.generationId
      ? updateQuery.eq('id', input.generationId)
      : updateQuery.eq('thread_id', input.threadId);
    const { error } = await updateQuery;
    if (error) {
      this.logger.error(`finishGeneration error: ${error.message}`);
    }

    // Keep the most recent checkpoints for resumability; discard older ones.
    await this.pruneCheckpoints(input.threadId, 20);

    // Also store a long-term memory summarizing the completed run.
    if (input.state?.projectId && input.summary) {
      await this.upsertMemory({
        userId: input.state.userId,
        projectId: input.state.projectId,
        memoryType: 'generation_summary',
        content: input.summary,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Long-term memory
  // ---------------------------------------------------------------------------
  async upsertMemory(input: {
    userId?: string;
    projectId?: string;
    memoryType: string;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    let query = this.supabase.admin
      .from('agent_memories')
      .select('id')
      .eq('memory_type', input.memoryType);
    query = input.userId ? query.eq('user_id', input.userId) : query.is('user_id', null);
    query = input.projectId ? query.eq('project_id', input.projectId) : query.is('project_id', null);

    const { data: existing, error: findError } = await query.maybeSingle();
    if (findError) {
      this.logger.error(`upsertMemory find error: ${findError.message}`);
      return;
    }

    const now = new Date().toISOString();
    if (existing?.id) {
      const { error } = await this.supabase.admin
        .from('agent_memories')
        .update({
          content: input.content,
          metadata: input.metadata ?? null,
          updated_at: now,
        })
        .eq('id', existing.id);
      if (error) this.logger.error(`upsertMemory update error: ${error.message}`);
    } else {
      const { error } = await this.supabase.admin.from('agent_memories').insert({
        user_id: input.userId ?? null,
        project_id: input.projectId ?? null,
        memory_type: input.memoryType,
        content: input.content,
        metadata: input.metadata ?? null,
      });
      if (error) this.logger.error(`upsertMemory insert error: ${error.message}`);
    }
  }

  async getMemories(input: {
    userId?: string;
    projectId?: string;
    memoryType?: string;
  }): Promise<Array<{ id: string; memoryType: string; content: string; metadata?: Record<string, unknown> }>> {
    let query = this.supabase.admin.from('agent_memories').select('id, memory_type, content, metadata');
    query = input.userId ? query.eq('user_id', input.userId) : query.is('user_id', null);
    query = input.projectId ? query.eq('project_id', input.projectId) : query.is('project_id', null);
    if (input.memoryType) query = query.eq('memory_type', input.memoryType);

    const { data, error } = await query.order('updated_at', { ascending: false }).limit(50);
    if (error) {
      this.logger.error(`getMemories error: ${error.message}`);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      memoryType: row.memory_type as string,
      content: row.content as string,
      metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    }));
  }
}
