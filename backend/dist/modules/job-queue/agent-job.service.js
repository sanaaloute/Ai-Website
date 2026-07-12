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
var AgentJobService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentJobService = exports.AGENT_JOB_CANCEL_KEY = exports.AGENT_JOB_EVENT_CHANNEL = exports.AGENT_JOB_QUEUE = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const redis_service_1 = require("../../lib/redis.service");
exports.AGENT_JOB_QUEUE = 'agent-jobs';
const AGENT_JOB_EVENT_CHANNEL = (jobId) => `agent:job:${jobId}:events`;
exports.AGENT_JOB_EVENT_CHANNEL = AGENT_JOB_EVENT_CHANNEL;
const AGENT_JOB_CANCEL_KEY = (jobId) => `agent:job:${jobId}:cancelled`;
exports.AGENT_JOB_CANCEL_KEY = AGENT_JOB_CANCEL_KEY;
let AgentJobService = AgentJobService_1 = class AgentJobService {
    constructor(agentQueue, redis) {
        this.agentQueue = agentQueue;
        this.redis = redis;
        this.logger = new common_1.Logger(AgentJobService_1.name);
    }
    async createSession(userId, data, ttlSeconds = 86400) {
        const sessionId = crypto.randomUUID();
        const session = { ...data, userId };
        await this.redis.getClient().setex(`agent:session:${sessionId}`, ttlSeconds, JSON.stringify(session));
        return sessionId;
    }
    async getSession(sessionId) {
        const raw = await this.redis.getClient().get(`agent:session:${sessionId}`);
        if (!raw)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch (e) {
            this.logger.error(`Failed to parse session ${sessionId}: ${e instanceof Error ? e.message : String(e)}`);
            return null;
        }
    }
    async deleteSession(sessionId) {
        await this.redis.getClient().del(`agent:session:${sessionId}`);
    }
    async enqueue(data, idempotencyKey) {
        const job = await this.agentQueue.add(exports.AGENT_JOB_QUEUE, data, {
            jobId: idempotencyKey,
            removeOnComplete: { age: 3600, count: 100 },
            removeOnFail: { age: 3600, count: 100 },
            attempts: 2,
            backoff: { type: 'exponential', delay: 5000 },
        });
        return job;
    }
    async getJob(jobId) {
        return this.agentQueue.getJob(jobId);
    }
    async cancel(jobId) {
        const client = this.redis.getClient();
        await client.setex((0, exports.AGENT_JOB_CANCEL_KEY)(jobId), 3600, '1');
        const job = await this.getJob(jobId);
        if (!job)
            return false;
        const state = await job.getState();
        const removableStates = new Set(['waiting', 'delayed', 'paused', 'prioritized', 'waiting-children']);
        if (removableStates.has(state)) {
            await job.remove();
            return true;
        }
        return state === 'active';
    }
    async isCancelled(jobId) {
        const result = await this.redis.getClient().get((0, exports.AGENT_JOB_CANCEL_KEY)(jobId));
        return result === '1';
    }
    async clearCancellation(jobId) {
        await this.redis.getClient().del((0, exports.AGENT_JOB_CANCEL_KEY)(jobId));
    }
    async getQueueMetrics() {
        const counts = await this.agentQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
        const [activeJobs, waitingJobs] = await Promise.all([
            this.agentQueue.getJobs('active', 0, 49, true),
            this.agentQueue.getJobs('waiting', 0, 49, true),
        ]);
        const mapJob = (j) => ({
            id: j.id,
            userId: j.data.userId,
            sandboxId: j.data.sandboxId,
            projectId: j.data.projectId,
            progress: typeof j.progress === 'number' ? j.progress : 0,
        });
        return {
            counts,
            active: activeJobs.map(mapJob),
            waiting: waitingJobs.map(mapJob),
        };
    }
    async publishEvent(jobId, event) {
        const channel = (0, exports.AGENT_JOB_EVENT_CHANNEL)(jobId);
        await this.redis.getClient().publish(channel, JSON.stringify(event));
    }
    subscribeToEvents(jobId, onEvent) {
        const subscriber = this.redis.getSubscriber();
        const channel = (0, exports.AGENT_JOB_EVENT_CHANNEL)(jobId);
        const handler = (message) => {
            try {
                const event = JSON.parse(message);
                onEvent(event);
            }
            catch (e) {
                this.logger.warn(`Malformed event on ${channel}: ${e instanceof Error ? e.message : String(e)}`);
            }
        };
        const messageListener = (receivedChannel, message) => {
            if (receivedChannel === channel) {
                handler(message);
            }
        };
        subscriber.subscribe(channel, (err) => {
            if (err) {
                this.logger.error(`Failed to subscribe to ${channel}: ${err.message}`);
            }
        });
        subscriber.on('message', messageListener);
        return {
            unsubscribe: () => {
                subscriber.off('message', messageListener);
                subscriber.unsubscribe(channel).catch(() => {
                });
                this.redis.releaseSubscriber(subscriber);
            },
        };
    }
};
exports.AgentJobService = AgentJobService;
exports.AgentJobService = AgentJobService = AgentJobService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(exports.AGENT_JOB_QUEUE)),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        redis_service_1.RedisService])
], AgentJobService);
//# sourceMappingURL=agent-job.service.js.map