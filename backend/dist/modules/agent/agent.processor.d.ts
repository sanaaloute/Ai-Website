import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AgentService } from "./agent.service";
import { AgentJobService, AgentJobData } from "../job-queue/agent-job.service";
import { RateLimitService } from "../../common/guards/rate-limit.service";
export declare class AgentProcessor extends WorkerHost {
    private readonly agentService;
    private readonly agentJobService;
    private readonly rateLimitService;
    private readonly logger;
    constructor(agentService: AgentService, agentJobService: AgentJobService, rateLimitService: RateLimitService);
    process(job: Job<AgentJobData>): Promise<{
        status: string;
        previewUrl?: string | null;
        error?: string;
    }>;
    private failJob;
    onFailed(job: Job<AgentJobData> | undefined, error: Error): void;
    onStalled(job: Job<AgentJobData> | undefined): void;
}
