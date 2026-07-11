import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
const KEY_PREFIX = 'idempotency:';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(private readonly redis: RedisService) {}

  async process<T>(key: string, fn: () => Promise<T>, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<T> {
    if (!key) {
      return fn();
    }

    const redisKey = `${KEY_PREFIX}${key}`;
    const cached = await this.redis.getClient().get(redisKey);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch (e) {
        this.logger.warn(`Failed to parse idempotency cache for ${key}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const result = await fn();
    try {
      await this.redis.getClient().setex(redisKey, ttlSeconds, JSON.stringify(result));
    } catch (e) {
      this.logger.warn(`Failed to cache idempotency result for ${key}: ${e instanceof Error ? e.message : String(e)}`);
    }
    return result;
  }

  async complete<T>(key: string, data: T, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    if (!key) return;
    const redisKey = `${KEY_PREFIX}${key}`;
    try {
      await this.redis.getClient().setex(redisKey, ttlSeconds, JSON.stringify(data));
    } catch (e) {
      this.logger.warn(`Failed to cache idempotency result for ${key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const redisKey = `${KEY_PREFIX}${key}`;
    const cached = await this.redis.getClient().get(redisKey);
    if (!cached) return null;
    try {
      return JSON.parse(cached) as T;
    } catch {
      return null;
    }
  }
}
