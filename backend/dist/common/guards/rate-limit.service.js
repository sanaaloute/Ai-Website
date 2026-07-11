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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../../lib/redis.service");
let RateLimitService = class RateLimitService {
    constructor(redisService) {
        this.redisService = redisService;
        this.MAX_CONCURRENT_GENERATIONS = 2;
        this.MAX_ENQUEUES_PER_MINUTE = 10;
        this.RATE_LIMIT_WINDOW_SECONDS = 60;
    }
    get redis() {
        return this.redisService.getClient();
    }
    async checkAgentStreamEnqueue(userId) {
        const concurrentKey = `ratelimit:user:${userId}:concurrent`;
        const minuteKey = `ratelimit:user:${userId}:minute:agent-stream`;
        const currentConcurrent = await this.redis.scard(concurrentKey);
        if (currentConcurrent >= this.MAX_CONCURRENT_GENERATIONS) {
            return {
                allowed: false,
                reason: `You already have ${this.MAX_CONCURRENT_GENERATIONS} active generations. Please wait for one to finish.`,
                retryAfterSeconds: 60,
            };
        }
        const currentMinute = await this.redis.get(minuteKey);
        if (currentMinute && parseInt(currentMinute, 10) >= this.MAX_ENQUEUES_PER_MINUTE) {
            return {
                allowed: false,
                reason: 'Too many generation requests. Please slow down.',
                retryAfterSeconds: this.RATE_LIMIT_WINDOW_SECONDS,
            };
        }
        return { allowed: true };
    }
    async reserveConcurrentGeneration(userId, jobId) {
        const concurrentKey = `ratelimit:user:${userId}:concurrent`;
        const minuteKey = `ratelimit:user:${userId}:minute:agent-stream`;
        await this.redis.sadd(concurrentKey, jobId);
        await this.redis.expire(concurrentKey, 86400);
        const pipeline = this.redis.pipeline();
        pipeline.incr(minuteKey);
        pipeline.expire(minuteKey, this.RATE_LIMIT_WINDOW_SECONDS);
        await pipeline.exec();
    }
    async releaseConcurrentGeneration(userId, jobId) {
        const concurrentKey = `ratelimit:user:${userId}:concurrent`;
        await this.redis.srem(concurrentKey, jobId);
    }
};
exports.RateLimitService = RateLimitService;
exports.RateLimitService = RateLimitService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], RateLimitService);
//# sourceMappingURL=rate-limit.service.js.map