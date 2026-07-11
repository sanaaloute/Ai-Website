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
var AgentPersistenceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentPersistenceService = void 0;
const common_1 = require("@nestjs/common");
const langgraph_checkpoint_1 = require("@langchain/langgraph-checkpoint");
const supabase_service_1 = require("../../../lib/supabase.service");
function toBase64(bytes) {
    return Buffer.from(bytes).toString('base64');
}
function fromBase64(base64) {
    return Uint8Array.from(Buffer.from(base64, 'base64'));
}
let AgentPersistenceService = AgentPersistenceService_1 = class AgentPersistenceService extends langgraph_checkpoint_1.BaseCheckpointSaver {
    constructor(supabase) {
        super();
        this.supabase = supabase;
        this.logger = new common_1.Logger(AgentPersistenceService_1.name);
    }
    stripFileContents(checkpoint) {
        const channelValues = checkpoint.channel_values;
        if (!channelValues?.filesWritten)
            return checkpoint;
        const filesWritten = channelValues.filesWritten;
        return {
            ...checkpoint,
            channel_values: {
                ...channelValues,
                filesWritten: filesWritten.map((fw) => ({
                    path: fw.path,
                    status: fw.status,
                    error: fw.error,
                })),
            },
        };
    }
    async encode(value) {
        const [type, bytes] = await this.serde.dumpsTyped(value);
        const blob = { type, data: toBase64(bytes) };
        return JSON.stringify(blob);
    }
    async decode(encoded) {
        const blob = JSON.parse(encoded);
        return this.serde.loadsTyped(blob.type, fromBase64(blob.data));
    }
    configKeys(config) {
        return {
            threadId: config.configurable?.thread_id,
            checkpointNs: config.configurable?.checkpoint_ns ?? '',
            checkpointId: config.configurable?.checkpoint_id ?? undefined,
        };
    }
    async getTuple(config) {
        const { threadId, checkpointNs, checkpointId } = this.configKeys(config);
        if (!threadId)
            return undefined;
        let query = this.supabase.admin
            .from('agent_checkpoints')
            .select('checkpoint_id, parent_checkpoint_id, checkpoint, metadata')
            .eq('thread_id', threadId)
            .eq('checkpoint_ns', checkpointNs);
        if (checkpointId) {
            query = query.eq('checkpoint_id', checkpointId);
        }
        else {
            query = query.order('created_at', { ascending: false }).limit(1);
        }
        const { data, error } = await query;
        if (error) {
            this.logger.error(`getTuple query error: ${error.message}`);
            return undefined;
        }
        if (!data || data.length === 0)
            return undefined;
        const row = data[0];
        const resolvedCheckpointId = row.checkpoint_id;
        const [checkpoint, metadata, pendingWrites] = await Promise.all([
            this.decode(row.checkpoint),
            row.metadata ? this.decode(row.metadata) : Promise.resolve(undefined),
            this.loadPendingWrites(threadId, checkpointNs, resolvedCheckpointId),
        ]);
        const tuple = {
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
                    checkpoint_id: row.parent_checkpoint_id,
                },
            };
        }
        return tuple;
    }
    async *list(config, options) {
        const { threadId, checkpointNs, checkpointId } = this.configKeys(config);
        const beforeCheckpointId = options?.before?.configurable?.checkpoint_id;
        let query = this.supabase.admin
            .from('agent_checkpoints')
            .select('thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, checkpoint, metadata, created_at');
        if (threadId)
            query = query.eq('thread_id', threadId);
        if (checkpointNs !== undefined)
            query = query.eq('checkpoint_ns', checkpointNs);
        if (checkpointId)
            query = query.eq('checkpoint_id', checkpointId);
        if (beforeCheckpointId)
            query = query.lt('checkpoint_id', beforeCheckpointId);
        query = query.order('created_at', { ascending: false });
        query = query.limit(options?.limit ?? 100);
        const { data, error } = await query;
        if (error) {
            this.logger.error(`list query error: ${error.message}`);
            return;
        }
        if (!data)
            return;
        for (const row of data) {
            const [checkpoint, metadata, pendingWrites] = await Promise.all([
                this.decode(row.checkpoint),
                row.metadata ? this.decode(row.metadata) : Promise.resolve(undefined),
                this.loadPendingWrites(row.thread_id, row.checkpoint_ns, row.checkpoint_id),
            ]);
            const tuple = {
                config: {
                    configurable: {
                        thread_id: row.thread_id,
                        checkpoint_ns: row.checkpoint_ns,
                        checkpoint_id: row.checkpoint_id,
                    },
                },
                checkpoint,
                metadata,
                pendingWrites,
            };
            if (row.parent_checkpoint_id) {
                tuple.parentConfig = {
                    configurable: {
                        thread_id: row.thread_id,
                        checkpoint_ns: row.checkpoint_ns,
                        checkpoint_id: row.parent_checkpoint_id,
                    },
                };
            }
            yield tuple;
        }
    }
    async put(config, checkpoint, metadata, _newVersions) {
        const { threadId, checkpointNs } = this.configKeys(config);
        if (!threadId) {
            throw new Error('Failed to put checkpoint. The passed RunnableConfig is missing a required "thread_id" field in its "configurable" property.');
        }
        const checkpointToSave = this.stripFileContents(checkpoint);
        const [checkpointBlob, metadataBlob] = await Promise.all([
            this.encode(checkpointToSave),
            this.encode(metadata),
        ]);
        const { error } = await this.supabase.admin.from('agent_checkpoints').upsert({
            thread_id: threadId,
            checkpoint_ns: checkpointNs,
            checkpoint_id: checkpoint.id,
            parent_checkpoint_id: config.configurable?.checkpoint_id,
            checkpoint: checkpointBlob,
            metadata: metadataBlob,
        }, { onConflict: 'thread_id,checkpoint_ns,checkpoint_id' });
        if (error) {
            this.logger.error(`put checkpoint error: ${error.message}`);
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
    async putWrites(config, writes, taskId) {
        const { threadId, checkpointNs, checkpointId } = this.configKeys(config);
        if (!threadId || !checkpointId) {
            this.logger.warn('putWrites called without thread_id or checkpoint_id; skipping.');
            return;
        }
        const rows = await Promise.all(writes.map(async (write, idx) => {
            const [channel, value] = write;
            const encoded = value === undefined ? null : await this.encode(value);
            return {
                thread_id: threadId,
                checkpoint_ns: checkpointNs,
                checkpoint_id: checkpointId,
                task_id: taskId,
                idx,
                channel: channel,
                value: encoded,
            };
        }));
        const { error } = await this.supabase.admin.from('agent_writes').upsert(rows, {
            onConflict: 'thread_id,checkpoint_ns,checkpoint_id,task_id,idx',
        });
        if (error) {
            this.logger.error(`putWrites error: ${error.message}`);
        }
    }
    async pruneCheckpoints(threadId, keepCount = 20) {
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
        if (!data?.length)
            return;
        const idsToDelete = data.map((row) => row.checkpoint_id);
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
    async deleteThread(threadId) {
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
    async loadPendingWrites(threadId, checkpointNs, checkpointId) {
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
        if (!data)
            return [];
        return Promise.all(data.map(async (row) => {
            const value = row.value ? await this.decode(row.value) : undefined;
            return [row.task_id, row.channel, value];
        }));
    }
    async startGeneration(input) {
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
        return data?.[0]?.id ?? null;
    }
    async finishGeneration(input) {
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
        await this.pruneCheckpoints(input.threadId, 20);
        if (input.state?.projectId && input.summary) {
            await this.upsertMemory({
                userId: input.state.userId,
                projectId: input.state.projectId,
                memoryType: 'generation_summary',
                content: input.summary,
            });
        }
    }
    async upsertMemory(input) {
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
            if (error)
                this.logger.error(`upsertMemory update error: ${error.message}`);
        }
        else {
            const { error } = await this.supabase.admin.from('agent_memories').insert({
                user_id: input.userId ?? null,
                project_id: input.projectId ?? null,
                memory_type: input.memoryType,
                content: input.content,
                metadata: input.metadata ?? null,
            });
            if (error)
                this.logger.error(`upsertMemory insert error: ${error.message}`);
        }
    }
    async getMemories(input) {
        let query = this.supabase.admin.from('agent_memories').select('id, memory_type, content, metadata');
        query = input.userId ? query.eq('user_id', input.userId) : query.is('user_id', null);
        query = input.projectId ? query.eq('project_id', input.projectId) : query.is('project_id', null);
        if (input.memoryType)
            query = query.eq('memory_type', input.memoryType);
        const { data, error } = await query.order('updated_at', { ascending: false }).limit(50);
        if (error) {
            this.logger.error(`getMemories error: ${error.message}`);
            return [];
        }
        return (data ?? []).map((row) => ({
            id: row.id,
            memoryType: row.memory_type,
            content: row.content,
            metadata: row.metadata ?? undefined,
        }));
    }
};
exports.AgentPersistenceService = AgentPersistenceService;
exports.AgentPersistenceService = AgentPersistenceService = AgentPersistenceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], AgentPersistenceService);
//# sourceMappingURL=agent-persistence.service.js.map