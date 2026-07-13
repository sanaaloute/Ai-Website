import { RedisService } from "../../lib/redis.service";
export interface RateLimitResult {
    allowed: boolean;
    reason?: string;
    retryAfterSeconds?: number;
}
export declare class RateLimitService {
    private readonly redisService;
    private readonly MAX_CONCURRENT_GENERATIONS;
    private readonly MAX_ENQUEUES_PER_MINUTE;
    private readonly RATE_LIMIT_WINDOW_SECONDS;
    constructor(redisService: RedisService);
    private get redis();
    checkAgentStreamEnqueue(userId: string): Promise<RateLimitResult>;
    reserveConcurrentGeneration(userId: string, jobId: string): Promise<void>;
    releaseConcurrentGeneration(userId: string, jobId: string): Promise<void>;
}
