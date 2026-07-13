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
var AgentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const e2b_service_1 = require("../../lib/e2b.service");
const ai_gateway_service_1 = require("../../lib/ai-gateway.service");
const provider_keys_service_1 = require("../profile/provider-keys.service");
const graph_1 = require("./graph");
const prompt_loader_service_1 = require("./services/prompt-loader.service");
const model_resolver_service_1 = require("./services/model-resolver.service");
const template_service_1 = require("./services/template.service");
const agent_persistence_service_1 = require("./services/agent-persistence.service");
const database_seeder_service_1 = require("./services/database-seeder.service");
const agent_mcp_tool_service_1 = require("./services/agent-mcp-tool.service");
const cancellation_1 = require("../../lib/cancellation");
let AgentService = AgentService_1 = class AgentService {
    constructor(aiGateway, e2b, providerKeys, promptLoader, modelResolver, templateService, persistence, databaseSeeder, agentMcpToolService) {
        this.aiGateway = aiGateway;
        this.e2b = e2b;
        this.providerKeys = providerKeys;
        this.promptLoader = promptLoader;
        this.modelResolver = modelResolver;
        this.templateService = templateService;
        this.persistence = persistence;
        this.databaseSeeder = databaseSeeder;
        this.agentMcpToolService = agentMcpToolService;
        this.logger = new common_1.Logger(AgentService_1.name);
        this.graph = (0, graph_1.buildAgentGraph)(this.persistence);
    }
    async *stream(options, onEvent) {
        const aiCredentials = await this.fetchUserCredentials(options.userId);
        const initialState = {
            prompt: options.prompt,
            sandboxId: options.sandboxId,
            projectId: options.projectId,
            userId: options.userId,
            chatHistory: options.chatHistory ?? [],
            aiCredentials,
            retryCount: 0,
            ...(options.resumeReview
                ? {
                    workflow: 'review_fix',
                    reviewIssues: options.resumeReview.issues,
                    reviewTodos: options.resumeReview.todos,
                    todos: options.resumeReview.todos,
                }
                : {}),
        };
        const emit = async (event) => {
            await onEvent(event);
        };
        const deps = {
            aiGateway: this.aiGateway,
            e2b: this.e2b,
            promptLoader: this.promptLoader,
            modelResolver: this.modelResolver,
            templateService: this.templateService,
            persistence: this.persistence,
            databaseSeeder: this.databaseSeeder,
            agentMcpToolService: this.agentMcpToolService,
            logger: this.logger,
            emit,
            signal: options.signal,
        };
        const threadId = options.threadId ?? `agent-${options.userId ?? 'anon'}-${(0, crypto_1.randomUUID)()}`;
        let finalResponse = '';
        const runningState = options.resume
            ? {}
            : { ...initialState };
        let generationId = await this.persistence.startGeneration({
            userId: options.userId,
            projectId: options.projectId,
            threadId,
            prompt: typeof options.prompt === 'string' ? options.prompt : JSON.stringify(options.prompt),
            workflow: initialState.workflow,
        });
        const snapshotId = generationId ?? (0, crypto_1.randomUUID)();
        try {
            await this.e2b.snapshotSandbox(options.sandboxId, snapshotId);
            const snapshotEvent = {
                type: 'snapshot',
                data: { snapshotId, sandboxId: options.sandboxId },
            };
            await emit(snapshotEvent);
            yield snapshotEvent;
        }
        catch (snapshotErr) {
            const snapshotMessage = snapshotErr instanceof Error ? snapshotErr.message : String(snapshotErr);
            this.logger.warn(`Failed to snapshot sandbox before generation: ${snapshotMessage}`);
        }
        try {
            const stream = await this.graph.stream(options.resume ? null : initialState, {
                streamMode: 'updates',
                configurable: { deps, thread_id: threadId },
                recursionLimit: 50,
                signal: options.signal,
            });
            for await (const chunk of stream) {
                if (options.signal?.aborted) {
                    throw new Error('Cancelled by user');
                }
                const { nodeName, update } = parseUpdateChunk(chunk);
                if (!nodeName)
                    continue;
                Object.assign(runningState, update);
                const message = update.messages?.[update.messages.length - 1]?.content || `Step ${nodeName}`;
                if (update.summary && typeof update.summary === 'string') {
                    finalResponse = update.summary;
                }
                const statusEvent = {
                    type: 'status',
                    data: { status: mapNodeToStatus(nodeName), message },
                };
                await emit(statusEvent);
                yield statusEvent;
                if (update.todos) {
                    const ev = { type: 'todos_update', data: { todos: update.todos } };
                    await emit(ev);
                    yield ev;
                }
                if (nodeName === 'executor' && update.filesWritten) {
                    for (const fw of update.filesWritten) {
                        const content = fw.content ?? '';
                        const ev = {
                            type: 'file_update',
                            data: {
                                path: fw.path,
                                status: fw.status,
                                size: content.length,
                                lineCount: content.split('\n').length,
                            },
                        };
                        await emit(ev);
                        yield ev;
                    }
                }
                if (nodeName === 'reviewer') {
                    const ev = {
                        type: 'review',
                        data: {
                            passed: update.reviewPassed ?? true,
                            issues: update.reviewIssues ?? [],
                            suggestions: update.reviewSuggestions ?? [],
                        },
                    };
                    await emit(ev);
                    yield ev;
                    if (update.reviewPassed === false &&
                        (runningState.retryCount ?? 0) >= 3) {
                        const maxReachedEvent = {
                            type: 'review_max_reached',
                            data: {
                                issues: update.reviewIssues ?? [],
                                todos: update.reviewTodos ?? [],
                            },
                        };
                        await emit(maxReachedEvent);
                        yield maxReachedEvent;
                    }
                }
                if (nodeName === 'finalize') {
                    const ev = {
                        type: 'preview',
                        data: { url: update.previewUrl || null },
                    };
                    await emit(ev);
                    yield ev;
                }
            }
            const doneEvent = {
                type: 'done',
                data: { finalResponse, snapshotId },
            };
            await emit(doneEvent);
            yield doneEvent;
            if (generationId) {
                await this.persistence.finishGeneration({
                    generationId,
                    threadId,
                    status: 'completed',
                    summary: finalResponse,
                    previewUrl: runningState.previewUrl,
                    state: runningState,
                });
            }
        }
        catch (e) {
            const cancelled = (0, cancellation_1.isCancellation)(e) || options.signal?.aborted;
            const message = cancelled ? 'Cancelled by user' : e instanceof Error ? e.message : String(e);
            if (!cancelled) {
                this.logger.error(`Graph execution error: ${message}`);
            }
            else {
                this.logger.log('Graph execution cancelled by user');
            }
            const errorEvent = { type: 'error', data: { message } };
            await emit(errorEvent);
            yield errorEvent;
            const doneEvent = { type: 'done', data: { finalResponse, snapshotId } };
            await emit(doneEvent);
            yield doneEvent;
            if (generationId) {
                await this.persistence.finishGeneration({
                    generationId,
                    threadId,
                    status: cancelled ? 'cancelled' : 'failed',
                    error: message,
                    state: runningState,
                });
            }
        }
    }
    async fetchUserCredentials(userId) {
        try {
            return await this.providerKeys.resolveCredentials(userId);
        }
        catch (e) {
            this.logger.warn(`Could not fetch user API credentials: ${e instanceof Error ? e.message : String(e)}`);
            return [];
        }
    }
};
exports.AgentService = AgentService;
exports.AgentService = AgentService = AgentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ai_gateway_service_1.AiGatewayService,
        e2b_service_1.E2BService,
        provider_keys_service_1.ProviderKeysService,
        prompt_loader_service_1.PromptLoaderService,
        model_resolver_service_1.ModelResolverService,
        template_service_1.TemplateService,
        agent_persistence_service_1.AgentPersistenceService,
        database_seeder_service_1.DatabaseSeederService,
        agent_mcp_tool_service_1.AgentMcpToolService])
], AgentService);
function parseUpdateChunk(chunk) {
    let payload;
    if (Array.isArray(chunk)) {
        payload = chunk[1] ?? {};
    }
    else if (chunk && typeof chunk === 'object') {
        payload = chunk;
    }
    else {
        return { nodeName: undefined, update: {} };
    }
    const keys = Object.keys(payload);
    if (keys.length === 0) {
        return { nodeName: undefined, update: {} };
    }
    const nodeName = keys[0];
    const update = payload[nodeName] ?? {};
    return { nodeName, update };
}
function mapNodeToStatus(nodeName) {
    switch (nodeName) {
        case 'coordinator':
        case 'analyzer':
        case 'template_selector':
            return 'analyzing';
        case 'planner':
        case 'pre_flight_validator':
            return 'planning';
        case 'executor':
        case 'file_state_tracker':
        case 'answer_generator':
            return 'executing';
        case 'reviewer':
            return 'reviewing';
        case 'debugger':
        case 'increment_retry':
            return 'debugging';
        case 'finalize':
            return 'finalizing';
        default:
            return nodeName;
    }
}
//# sourceMappingURL=agent.service.js.map