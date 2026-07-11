import { RedisService } from './redis.service';
export declare class IdempotencyService {
    private readonly redis;
    private readonly logger;
    constructor(redis: RedisService);
    process<T>(key: string, fn: () => Promise<T>, ttlSeconds?: number): Promise<T>;
    complete<T>(key: string, data: T, ttlSeconds?: number): Promise<void>;
    get<T>(key: string): Promise<T | null>;
}
