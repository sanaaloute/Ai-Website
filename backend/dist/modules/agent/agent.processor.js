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
var AgentProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const agent_service_1 = require("./agent.service");
const agent_job_service_1 = require("../job-queue/agent-job.service");
const rate_limit_service_1 = require("../../common/guards/rate-limit.service");
const env_1 = require("../../config/env");
const WORKER_CONCURRENCY = parseInt(process.env.AGENT_WORKER_CONCURRENCY ?? '4', 10);
let AgentProcessor = AgentProcessor_1 = class AgentProcessor extends bullmq_1.WorkerHost {
    constructor(agentService, agentJobService, rateLimitService) {
        super();
        this.agentService = agentService;
        this.agentJobService = agentJobService;
        this.rateLimitService = rateLimitService;
        this.logger = new common_1.Logger(AgentProcessor_1.name);
    }
    async process(job) {
        const { userId, sandboxId, projectId, threadId, resume, resumeReview, chatHistory, prompt } = job.data;
        this.logger.log(`Processing agent job ${job.id} for user ${userId}, sandbox ${sandboxId}`);
        const publisher = async (event) => {
            await this.agentJobService.publishEvent(job.id, event);
        };
        const options = {
            userId,
            prompt: prompt ?? '',
            sandboxId,
            projectId,
            threadId: threadId ?? `agent-job-${job.id}`,
            resume: resume || job.attemptsMade > 0,
            chatHistory,
            resumeReview,
        };
        let cancellationPoller;
        let jobTimeout;
        let jobTimedOut = false;
        try {
            let finalPreviewUrl = null;
            let finalResponse = '';
            let wasCancelled = false;
            await this.agentJobService.clearCancellation(job.id);
            const abortController = new AbortController();
            cancellationPoller = setInterval(async () => {
                if (await this.agentJobService.isCancelled(job.id)) {
                    abortController.abort();
                }
            }, 500);
            jobTimeout = setTimeout(() => {
                jobTimedOut = true;
                this.logger.error(`Agent job ${job.id} exceeded AGENT_JOB_TIMEOUT_MS (${(0, env_1.env)().agentJobTimeoutMs}ms) — aborting`);
                abortController.abort();
            }, (0, env_1.env)().agentJobTimeoutMs);
            options.signal = abortController.signal;
            for await (const event of this.agentService.stream(options, publisher)) {
                if (await this.agentJobService.isCancelled(job.id)) {
                    wasCancelled = true;
                    break;
                }
                if (event.type === 'preview') {
                    finalPreviewUrl = typeof event.data.url === 'string' ? event.data.url : null;
                }
                if (event.type === 'done') {
                    finalResponse = event.data.finalResponse ?? '';
                }
            }
            if (cancellationPoller)
                clearInterval(cancellationPoller);
            if (jobTimeout)
                clearTimeout(jobTimeout);
            if (jobTimedOut) {
                const message = `Agent job timed out after ${(0, env_1.env)().agentJobTimeoutMs}ms`;
                await publisher({ type: 'error', data: { message } });
                await this.rateLimitService.releaseConcurrentGeneration(userId, job.id);
                throw new Error(message);
            }
            if (wasCancelled) {
                const cancelEvent = { type: 'error', data: { message: 'Cancelled by user' } };
                const doneEvent = { type: 'done', data: {} };
                await publisher(cancelEvent);
                await publisher(doneEvent);
                await this.rateLimitService.releaseConcurrentGeneration(userId, job.id);
                this.logger.log(`Agent job ${job.id} cancelled by user`);
                return { status: 'cancelled' };
            }
            await job.updateProgress({ status: 'completed', previewUrl: finalPreviewUrl, finalResponse });
            await this.rateLimitService.releaseConcurrentGeneration(userId, job.id);
            return { status: 'completed', previewUrl: finalPreviewUrl };
        }
        catch (e) {
            if (cancellationPoller)
                clearInterval(cancellationPoller);
            if (jobTimeout)
                clearTimeout(jobTimeout);
            const message = e instanceof Error ? e.message : String(e);
            this.logger.error(`Agent job ${job.id} failed: ${message}`);
            await this.rateLimitService.releaseConcurrentGeneration(userId, job.id);
            if (jobTimedOut) {
                throw new Error(`Agent job timed out after ${(0, env_1.env)().agentJobTimeoutMs}ms`);
            }
            throw e;
        }
    }
    onFailed(job, error) {
        this.logger.error(`Agent job ${job?.id} failed permanently: ${error.message}`);
        if (job) {
            this.logger.error(`[dlq] agent job ${job.id} dead-lettered after ${job.attemptsMade} attempt(s) ` +
                `(user ${job.data.userId}, sandbox ${job.data.sandboxId}): ${error.message}`);
            void this.rateLimitService.releaseConcurrentGeneration(job.data.userId, job.id);
        }
    }
    onStalled(job) {
        if (job) {
            this.logger.warn(`Agent job ${job.id} stalled — releasing concurrency slot`);
            void this.rateLimitService.releaseConcurrentGeneration(job.data.userId, job.id);
        }
    }
};
exports.AgentProcessor = AgentProcessor;
__decorate([
    (0, bullmq_1.OnWorkerEvent)('failed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", void 0)
], AgentProcessor.prototype, "onFailed", null);
__decorate([
    (0, bullmq_1.OnWorkerEvent)('stalled'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AgentProcessor.prototype, "onStalled", null);
exports.AgentProcessor = AgentProcessor = AgentProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(agent_job_service_1.AGENT_JOB_QUEUE, {
        concurrency: WORKER_CONCURRENCY,
        limiter: {
            max: 10,
            duration: 1000,
        },
    }),
    __metadata("design:paramtypes", [agent_service_1.AgentService,
        agent_job_service_1.AgentJobService,
        rate_limit_service_1.RateLimitService])
], AgentProcessor);
//# sourceMappingURL=agent.processor.js.map