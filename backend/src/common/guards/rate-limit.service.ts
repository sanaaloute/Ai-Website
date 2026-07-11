import { Injectable } from '@nestjs/common';
import { RedisService } from '@/lib/redis.service';

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
}

@Injectable()
export class RateLimitService {
  // Hard caps. These could move to env vars in a follow-up.
  private readonly MAX_CONCURRENT_GENERATIONS = 2;
  private readonly MAX_ENQUEUES_PER_MINUTE = 10;
  private readonly RATE_LIMIT_WINDOW_SECONDS = 60;

  constructor(private readonly redisService: RedisService) {}

  private get redis() {
    return this.redisService.getClient();
  }

  async checkAgentStreamEnqueue(userId: string): Promise<RateLimitResult> {
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

  async reserveConcurrentGeneration(userId: string, jobId: string): Promise<void> {
    const concurrentKey = `ratelimit:user:${userId}:concurrent`;
    const minuteKey = `ratelimit:user:${userId}:minute:agent-stream`;

    await this.redis.sadd(concurrentKey, jobId);
    await this.redis.expire(concurrentKey, 86400);

    const pipeline = this.redis.pipeline();
    pipeline.incr(minuteKey);
    pipeline.expire(minuteKey, this.RATE_LIMIT_WINDOW_SECONDS);
    await pipeline.exec();
  }

  async releaseConcurrentGeneration(userId: string, jobId: string): Promise<void> {
    const concurrentKey = `ratelimit:user:${userId}:concurrent`;
    await this.redis.srem(concurrentKey, jobId);
  }
}
