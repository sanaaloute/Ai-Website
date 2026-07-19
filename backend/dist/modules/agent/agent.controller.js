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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AgentController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentController = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const auth_guard_1 = require("../../common/guards/auth.guard");
const api_key_guard_1 = require("../../common/guards/api-key.guard");
const user_decorator_1 = require("../../common/decorators/user.decorator");
const ai_gateway_service_1 = require("../../lib/ai-gateway.service");
const e2b_service_1 = require("../../lib/e2b.service");
const provider_keys_service_1 = require("../profile/provider-keys.service");
const entitlements_service_1 = require("../billing/entitlements.service");
const agent_service_1 = require("./agent.service");
const model_resolver_service_1 = require("./services/model-resolver.service");
const agent_job_service_1 = require("../job-queue/agent-job.service");
const idempotency_service_1 = require("../../lib/idempotency.service");
const rate_limit_service_1 = require("../../common/guards/rate-limit.service");
const rate_limit_guard_1 = require("../../common/guards/rate-limit.guard");
const WORKDIR = '/home/user/app';
const ai_helper_dto_1 = require("./dto/ai-helper.dto");
function sseInit(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(':ok\n\n');
}
function sseWrite(res, payload) {
    if (res.writableEnded)
        return;
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    res.flush?.();
}
function sseDone(res) {
    if (!res.writableEnded) {
        res.write(`data: {"type":"done","data":{}}\n\n`);
        res.end();
    }
}
let AgentController = AgentController_1 = class AgentController {
    constructor(ai, e2b, providerKeys, entitlements, agentService, modelResolver, agentJobService, rateLimitService, idempotency) {
        this.ai = ai;
        this.e2b = e2b;
        this.providerKeys = providerKeys;
        this.entitlements = entitlements;
        this.agentService = agentService;
        this.modelResolver = modelResolver;
        this.agentJobService = agentJobService;
        this.rateLimitService = rateLimitService;
        this.idempotency = idempotency;
        this.logger = new common_1.Logger(AgentController_1.name);
    }
    async createAgentSession(user, body) {
        const prompt = this.validatePrompt(body.prompt);
        const templateRepo = typeof body.templateRepo === 'string' ? body.templateRepo : undefined;
        if (templateRepo) {
            await this.entitlements.assertFeature(user.id, 'templates');
        }
        const sessionData = {
            prompt: prompt ?? undefined,
            templateRepo,
            templatePrompt: typeof body.templatePrompt === 'string' ? body.templatePrompt : undefined,
            projectName: typeof body.projectName === 'string' ? body.projectName : undefined,
        };
        const sessionId = await this.agentJobService.createSession(user.id, sessionData);
        return { success: true, sessionId };
    }
    async getAgentSession(user, sessionId) {
        const session = await this.agentJobService.getSession(sessionId);
        if (!session || session.userId !== user.id) {
            throw new common_1.HttpException({ success: false, error: 'Session not found' }, common_1.HttpStatus.NOT_FOUND);
        }
        return { success: true, session };
    }
    async getActiveAgentJob(user, sandboxId) {
        if (!sandboxId) {
            throw new common_1.HttpException({ success: false, error: 'sandboxId query param required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const job = await this.agentJobService.findActiveJob(user.id, sandboxId);
        return { success: true, job };
    }
    async agentStream(user, body) {
        if (!body.sandboxId || typeof body.sandboxId !== 'string') {
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const sandboxId = body.sandboxId;
        const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
        return this.idempotency.process(idempotencyKey, async () => {
            let prompt;
            let sessionId;
            const resumeReview = this.validateResumeReview(body.resumeReview);
            const isContinuation = body.resume === true || resumeReview !== undefined;
            if (!isContinuation) {
                await this.entitlements.consumeGeneration(user.id);
            }
            if (typeof body.sessionId === 'string') {
                const session = await this.agentJobService.getSession(body.sessionId);
                if (!session || session.userId !== user.id) {
                    throw new common_1.HttpException({ success: false, error: 'Session not found' }, common_1.HttpStatus.NOT_FOUND);
                }
                prompt = session.prompt;
                sessionId = body.sessionId;
            }
            else {
                const validated = this.validatePrompt(body.prompt);
                if (!validated) {
                    throw new common_1.HttpException({ success: false, error: 'prompt must be a non-empty string or an array of text/image_url parts, or provide sessionId' }, common_1.HttpStatus.BAD_REQUEST);
                }
                sessionId = await this.agentJobService.createSession(user.id, { prompt: validated });
                prompt = validated;
            }
            const job = await this.agentJobService.enqueue({
                sessionId,
                userId: user.id,
                sandboxId,
                projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
                threadId: typeof body.threadId === 'string' && body.threadId ? body.threadId : undefined,
                resume: body.resume === true,
                chatHistory: Array.isArray(body.chatHistory)
                    ? body.chatHistory.filter((h) => typeof h === 'object' && h !== null && 'role' in h && 'content' in h)
                    : [],
                resumeReview,
                prompt,
            }, idempotencyKey || `${user.id}:${sessionId}:${sandboxId}`);
            await this.rateLimitService.reserveConcurrentGeneration(user.id, job.id);
            return { success: true, jobId: job.id, status: 'queued' };
        }, 86400);
    }
    async cancelAgentJob(user, jobId) {
        const job = await this.agentJobService.getJob(jobId);
        if (!job) {
            throw new common_1.HttpException({ success: false, error: 'Job not found' }, common_1.HttpStatus.NOT_FOUND);
        }
        if (job.data.userId !== user.id) {
            throw new common_1.HttpException({ success: false, error: 'Forbidden' }, common_1.HttpStatus.FORBIDDEN);
        }
        const wasActiveOrWaiting = await this.agentJobService.cancel(jobId);
        await this.rateLimitService.releaseConcurrentGeneration(user.id, jobId);
        return {
            success: true,
            cancelled: wasActiveOrWaiting,
            message: wasActiveOrWaiting ? 'Job cancelled' : 'Job already completed or failed',
        };
    }
    async subscribeToAgentStream(user, jobId, res) {
        const job = await this.agentJobService.getJob(jobId);
        if (!job) {
            throw new common_1.HttpException({ success: false, error: 'Job not found' }, common_1.HttpStatus.NOT_FOUND);
        }
        if (job.data.userId !== user.id) {
            throw new common_1.HttpException({ success: false, error: 'Forbidden' }, common_1.HttpStatus.FORBIDDEN);
        }
        sseInit(res);
        const abort = () => {
            if (!res.writableEnded)
                res.end();
        };
        res.req.on('close', abort);
        const state = await job.getState();
        const progress = (await job.progress);
        if (state === 'completed') {
            sseWrite(res, { type: 'status', data: { status: 'completed', message: 'Generation completed' } });
            if (typeof progress?.previewUrl === 'string') {
                sseWrite(res, { type: 'preview', data: { url: progress.previewUrl } });
            }
            sseWrite(res, { type: 'done', data: progress ?? {} });
            res.end();
            return;
        }
        if (state === 'failed') {
            sseWrite(res, { type: 'error', data: { message: job.failedReason || 'Generation failed' } });
            sseWrite(res, { type: 'done', data: {} });
            res.end();
            return;
        }
        const { unsubscribe } = this.agentJobService.subscribeToEvents(jobId, (event) => {
            sseWrite(res, event);
            if (event.type === 'done' || event.type === 'error') {
                clearInterval(heartbeat);
                unsubscribe();
                if (!res.writableEnded)
                    res.end();
            }
        });
        const heartbeat = setInterval(() => {
            if (res.writableEnded) {
                clearInterval(heartbeat);
                return;
            }
            res.write(':heartbeat\n\n');
            res.flush?.();
        }, 15000);
        const checkInterval = setInterval(async () => {
            const currentState = await job.getState();
            if (currentState === 'completed' || currentState === 'failed') {
                clearInterval(checkInterval);
                clearInterval(heartbeat);
                unsubscribe();
                if (!res.writableEnded)
                    res.end();
            }
        }, 5000);
        res.req.on('close', () => {
            clearInterval(checkInterval);
            clearInterval(heartbeat);
            unsubscribe();
        });
    }
    async chat(user, body, res) {
        sseInit(res);
        res.req.on('close', () => {
            if (!res.writableEnded)
                res.end();
        });
        try {
            const aiCredentials = await this.fetchUserCredentials(user.id);
            const stream = await this.ai.chat(body.prompt, this.modelResolver.resolveSequence('chat'), aiCredentials);
            for await (const chunk of stream) {
                sseWrite(res, chunk);
            }
        }
        catch (err) {
            sseWrite(res, { type: 'error', data: { message: err instanceof Error ? err.message : String(err) } });
        }
        finally {
            sseDone(res);
        }
    }
    async applyAiCodeStream(_user, body, res) {
        const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
        if (idempotencyKey) {
            const cached = await this.idempotency.get(idempotencyKey);
            if (cached) {
                sseInit(res);
                sseWrite(res, { type: 'start', message: 'Applying AI code' });
                sseWrite(res, { type: 'step', message: 'Parsing response', packages: cached.packages ?? [] });
                sseWrite(res, { type: 'complete', completionAck: cached.completionAck, results: cached.results });
                sseDone(res);
                return;
            }
        }
        sseInit(res);
        res.req.on('close', () => {
            if (!res.writableEnded)
                res.end();
        });
        const packagesInstalled = [];
        const packagesFailed = [];
        const commandsExecuted = [];
        const errors = [];
        const filesCreated = [];
        const filesUpdated = [];
        try {
            sseWrite(res, { type: 'start', message: 'Applying AI code' });
            sseWrite(res, { type: 'step', message: 'Parsing response', packages: body.packages ?? [] });
            const files = this.parseFiles(body.response ?? '{}');
            for (const file of files) {
                if (body.sandboxId) {
                    await this.e2b.writeFile(body.sandboxId, file.path, file.content);
                }
                filesCreated.push(file.path);
                sseWrite(res, { type: 'file-progress', fileName: file.path });
                sseWrite(res, { type: 'file-complete', fileName: file.path });
            }
            if (body.packages?.length && body.sandboxId) {
                sseWrite(res, {
                    type: 'step',
                    message: `Installing ${body.packages.length} packages`,
                    packages: body.packages,
                });
                const command = `npm install ${body.packages.join(' ')}`;
                commandsExecuted.push(command);
                const stdoutChunks = [];
                const stderrChunks = [];
                const result = await this.e2b.runCommand(body.sandboxId, command, WORKDIR, {
                    timeoutMs: 10 * 60 * 1000,
                    onStdout: (data) => {
                        stdoutChunks.push(data);
                        sseWrite(res, { type: 'command-output', output: data, stream: 'stdout' });
                    },
                    onStderr: (data) => {
                        stderrChunks.push(data);
                        sseWrite(res, { type: 'command-output', output: data, stream: 'stderr' });
                    },
                });
                if (result.exitCode === 0) {
                    packagesInstalled.push(...body.packages);
                }
                else {
                    packagesFailed.push(...body.packages);
                    errors.push(result.error || stderrChunks.join('\n') || `npm install failed with exit code ${result.exitCode}`);
                }
            }
            const completionAck = {
                status: errors.length > 0 ? 'noop' : 'applied',
                token: (0, crypto_1.randomUUID)().replace(/-/g, ''),
                streamVersion: 1,
            };
            const results = {
                packagesInstalled,
                packagesFailed,
                filesCreated,
                filesUpdated,
                commandsExecuted,
                errors,
            };
            sseWrite(res, { type: 'complete', completionAck, results });
            if (idempotencyKey) {
                await this.idempotency.complete(idempotencyKey, { packages: body.packages, completionAck, results }, 86400);
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            errors.push(message);
            sseWrite(res, {
                type: 'error',
                message,
            });
            sseWrite(res, {
                type: 'complete',
                completionAck: {
                    status: 'noop',
                    token: (0, crypto_1.randomUUID)().replace(/-/g, ''),
                    streamVersion: 1,
                },
                results: {
                    packagesInstalled,
                    packagesFailed,
                    filesCreated,
                    filesUpdated,
                    commandsExecuted,
                    errors,
                },
            });
        }
        finally {
            sseDone(res);
        }
    }
    async codeComponent(user, body) {
        const aiCredentials = await this.fetchUserCredentials(user.id);
        return this.ai.generateComponent(body.section, body.tokens, this.modelResolver.resolveSequence('code_component'), aiCredentials);
    }
    async codePage(user, body) {
        const aiCredentials = await this.fetchUserCredentials(user.id);
        return this.ai.generatePage(body.page, body.sections ?? [], this.modelResolver.resolveSequence('code_page'), aiCredentials);
    }
    async designTokens(user, body) {
        const aiCredentials = await this.fetchUserCredentials(user.id);
        return this.ai.designTokens(body.spec, this.modelResolver.resolveSequence('design_tokens'), aiCredentials);
    }
    async specSummarize(user, body) {
        const aiCredentials = await this.fetchUserCredentials(user.id);
        return this.ai.summarizeSpec(body.prompt, this.modelResolver.resolveSequence('spec_summarize'), aiCredentials);
    }
    async uiUxBlueprint(user, body) {
        const aiCredentials = await this.fetchUserCredentials(user.id);
        return this.ai.uiUxBlueprint(body.spec, this.modelResolver.resolveSequence('spec_ui_ux_blueprint'), aiCredentials);
    }
    async filePlan(user, body) {
        const aiCredentials = await this.fetchUserCredentials(user.id);
        return this.ai.filePlan(body.spec, body.blueprint, this.modelResolver.resolveSequence('file_plan'), aiCredentials);
    }
    async analyzeEditIntent(user, body) {
        const aiCredentials = await this.fetchUserCredentials(user.id);
        const searchPlan = await this.ai.analyzeEditIntent(body.prompt, body.manifest, this.modelResolver.resolveSequence('analyze_edit_intent'), aiCredentials);
        return { success: true, search_plan: searchPlan };
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
    parseFiles(response) {
        try {
            const parsed = JSON.parse(response);
            const files = Array.isArray(parsed.files) ? parsed.files : [];
            const forbiddenPrefixes = e2b_service_1.FORBIDDEN_PATH_PREFIXES;
            return files.filter((file) => {
                const p = file?.path ?? '';
                return !forbiddenPrefixes.some((prefix) => p.startsWith(prefix));
            });
        }
        catch {
            return [];
        }
    }
    validateResumeReview(value) {
        if (!value || typeof value !== 'object')
            return undefined;
        const obj = value;
        if (!Array.isArray(obj.issues) || obj.issues.length === 0)
            return undefined;
        const issues = obj.issues.filter((i) => typeof i === 'string');
        if (issues.length === 0)
            return undefined;
        let todos;
        if (Array.isArray(obj.todos)) {
            todos = obj.todos
                .filter((t) => typeof t === 'object' &&
                t !== null &&
                typeof t.id === 'string' &&
                typeof t.content === 'string' &&
                typeof t.status === 'string')
                .map((t) => ({
                id: t.id,
                content: t.content,
                status: ['pending', 'in_progress', 'completed'].includes(t.status)
                    ? t.status
                    : 'pending',
            }));
            if (todos.length === 0)
                todos = undefined;
        }
        return { issues, todos };
    }
    validatePrompt(value) {
        if (typeof value === 'string' && value.length > 0) {
            return value;
        }
        if (Array.isArray(value) && value.length > 0) {
            const parts = [];
            for (const item of value) {
                if (typeof item === 'object' &&
                    item !== null &&
                    'type' in item &&
                    item.type === 'text' &&
                    'text' in item &&
                    typeof item.text === 'string') {
                    parts.push({ type: 'text', text: item.text });
                    continue;
                }
                if (typeof item === 'object' &&
                    item !== null &&
                    'type' in item &&
                    item.type === 'image_url' &&
                    'image_url' in item &&
                    typeof item.image_url === 'object' &&
                    item.image_url !== null &&
                    'url' in item.image_url &&
                    typeof item.image_url.url === 'string') {
                    const imagePart = item;
                    parts.push({
                        type: 'image_url',
                        image_url: {
                            url: imagePart.image_url.url,
                            detail: imagePart.image_url.detail,
                        },
                    });
                    continue;
                }
                return null;
            }
            return parts;
        }
        return null;
    }
};
exports.AgentController = AgentController;
__decorate([
    (0, common_1.Post)('agent-sessions'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "createAgentSession", null);
__decorate([
    (0, common_1.Get)('agent-sessions/:sessionId'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "getAgentSession", null);
__decorate([
    (0, common_1.Get)('agent-jobs/active'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('sandboxId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "getActiveAgentJob", null);
__decorate([
    (0, common_1.Post)('agent-stream'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, api_key_guard_1.ApiKeyGuard, rate_limit_guard_1.AgentStreamRateLimitGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "agentStream", null);
__decorate([
    (0, common_1.Post)('agent-jobs/:jobId/cancel'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "cancelAgentJob", null);
__decorate([
    (0, common_1.Get)('agent-stream/:jobId'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('jobId')),
    __param(2, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "subscribeToAgentStream", null);
__decorate([
    (0, common_1.Post)('chat'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, api_key_guard_1.ApiKeyGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ai_helper_dto_1.ChatDto, Object]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "chat", null);
__decorate([
    (0, common_1.Post)('apply-ai-code-stream'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "applyAiCodeStream", null);
__decorate([
    (0, common_1.Post)('code/component'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, api_key_guard_1.ApiKeyGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ai_helper_dto_1.CodeComponentDto]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "codeComponent", null);
__decorate([
    (0, common_1.Post)('code/page'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, api_key_guard_1.ApiKeyGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ai_helper_dto_1.CodePageDto]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "codePage", null);
__decorate([
    (0, common_1.Post)('design/tokens'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, api_key_guard_1.ApiKeyGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ai_helper_dto_1.DesignTokensDto]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "designTokens", null);
__decorate([
    (0, common_1.Post)('spec/summarize'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, api_key_guard_1.ApiKeyGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ai_helper_dto_1.SummarizeSpecDto]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "specSummarize", null);
__decorate([
    (0, common_1.Post)('spec/ui-ux-blueprint'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, api_key_guard_1.ApiKeyGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ai_helper_dto_1.UiUxBlueprintDto]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "uiUxBlueprint", null);
__decorate([
    (0, common_1.Post)('project/file-plan'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, api_key_guard_1.ApiKeyGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ai_helper_dto_1.FilePlanDto]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "filePlan", null);
__decorate([
    (0, common_1.Post)('analyze-edit-intent'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, api_key_guard_1.ApiKeyGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ai_helper_dto_1.AnalyzeEditIntentDto]),
    __metadata("design:returntype", Promise)
], AgentController.prototype, "analyzeEditIntent", null);
exports.AgentController = AgentController = AgentController_1 = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [ai_gateway_service_1.AiGatewayService,
        e2b_service_1.E2BService,
        provider_keys_service_1.ProviderKeysService,
        entitlements_service_1.EntitlementsService,
        agent_service_1.AgentService,
        model_resolver_service_1.ModelResolverService,
        agent_job_service_1.AgentJobService,
        rate_limit_service_1.RateLimitService,
        idempotency_service_1.IdempotencyService])
], AgentController);
//# sourceMappingURL=agent.controller.js.map