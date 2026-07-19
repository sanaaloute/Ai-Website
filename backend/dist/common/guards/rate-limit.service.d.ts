import { RedisService } from "../../lib/redis.service";
export interface RateLimitResult {
    allowed: boolean;
    reason?: string;
    retryAfterSeconds?: number;
}
export declare class RateLimitService {
    private readonly redisService;
    private readonly RATE_LIMIT_WINDOW_SECONDS;
    constructor(redisService: RedisService);
    private get redis();
    private get maxConcurrentGenerations();
    private get maxEnqueuesPerMinute();
    checkAgentStreamEnqueue(userId: string): Promise<RateLimitResult>;
    reserveConcurrentGeneration(userId: string, jobId: string): Promise<void>;
    releaseConcurrentGeneration(userId: string, jobId: string): Promise<void>;
}
