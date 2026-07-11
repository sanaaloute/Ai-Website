import { Queue, Job } from 'bullmq';
import { RedisService } from "../../lib/redis.service";
import { AgentEvent } from "../agent/state";
import { PromptContent } from "../../types";
export declare const AGENT_JOB_QUEUE = "agent-jobs";
export declare const AGENT_JOB_EVENT_CHANNEL: (jobId: string) => string;
export declare const AGENT_JOB_CANCEL_KEY: (jobId: string) => string;
export interface AgentJobData {
    sessionId: string;
    userId: string;
    sandboxId: string;
    projectId?: string;
    threadId?: string;
    resume?: boolean;
    resumeReview?: {
        issues: string[];
        todos?: Array<{
            id: string;
            content: string;
            status: string;
        }>;
    };
    chatHistory?: Array<{
        role: string;
        content: string;
    }>;
    prompt?: PromptContent;
}
export interface AgentSessionData {
    prompt?: PromptContent;
    templateRepo?: string;
    templatePrompt?: string;
    projectName?: string;
    userId: string;
}
export declare class AgentJobService {
    private readonly agentQueue;
    private readonly redis;
    private readonly logger;
    constructor(agentQueue: Queue<AgentJobData>, redis: RedisService);
    createSession(userId: string, data: Omit<AgentSessionData, 'userId'>, ttlSeconds?: number): Promise<string>;
    getSession(sessionId: string): Promise<AgentSessionData | null>;
    deleteSession(sessionId: string): Promise<void>;
    enqueue(data: AgentJobData, idempotencyKey?: string): Promise<Job<AgentJobData>>;
    getJob(jobId: string): Promise<Job<AgentJobData> | undefined>;
    cancel(jobId: string): Promise<boolean>;
    isCancelled(jobId: string): Promise<boolean>;
    clearCancellation(jobId: string): Promise<void>;
    getQueueMetrics(): Promise<{
        counts: Record<string, number>;
        active: Array<{
            id?: string;
            userId: string;
            sandboxId: string;
            projectId?: string;
            progress: number;
        }>;
        waiting: Array<{
            id?: string;
            userId: string;
            sandboxId: string;
            projectId?: string;
            progress: number;
        }>;
    }>;
    publishEvent(jobId: string, event: AgentEvent): Promise<void>;
    subscribeToEvents(jobId: string, onEvent: (event: AgentEvent) => void): {
        unsubscribe: () => void;
    };
}
