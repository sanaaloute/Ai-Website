import { Injectable } from '@nestjs/common';
import { RedisService } from '@/lib/redis.service';
import { env } from '@/config/env';

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
}

@Injectable()
export class RateLimitService {
  private readonly RATE_LIMIT_WINDOW_SECONDS = 60;

  constructor(private readonly redisService: RedisService) {}

  private get redis() {
    return this.redisService.getClient();
  }

  private get maxConcurrentGenerations() {
    return env().agentMaxConcurrentGenerations;
  }

  private get maxEnqueuesPerMinute() {
    return env().agentMaxEnqueuesPerMinute;
  }

  async checkAgentStreamEnqueue(userId: string): Promise<RateLimitResult> {
    const concurrentKey = `ratelimit:user:${userId}:concurrent`;
    const minuteKey = `ratelimit:user:${userId}:minute:agent-stream`;

    const currentConcurrent = await this.redis.scard(concurrentKey);
    if (currentConcurrent >= this.maxConcurrentGenerations) {
      return {
        allowed: false,
        reason: `You already have ${this.maxConcurrentGenerations} active generations. Please wait for one to finish.`,
        retryAfterSeconds: 60,
      };
    }

    const currentMinute = await this.redis.get(minuteKey);
    if (currentMinute && parseInt(currentMinute, 10) >= this.maxEnqueuesPerMinute) {
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
