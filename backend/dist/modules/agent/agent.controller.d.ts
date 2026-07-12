import { Response } from 'express';
import { User } from "../../types";
import { AiGatewayService } from "../../lib/ai-gateway.service";
import { E2BService } from "../../lib/e2b.service";
import { ProviderKeysService } from "../profile/provider-keys.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { AgentService } from './agent.service';
import { ModelResolverService } from './services/model-resolver.service';
import { AgentJobService, AgentSessionData } from "../job-queue/agent-job.service";
import { IdempotencyService } from "../../lib/idempotency.service";
import { RateLimitService } from "../../common/guards/rate-limit.service";
import { ChatDto, AnalyzeEditIntentDto, CodeComponentDto, CodePageDto, DesignTokensDto, SummarizeSpecDto, UiUxBlueprintDto, FilePlanDto } from './dto/ai-helper.dto';
export declare class AgentController {
    private readonly ai;
    private readonly e2b;
    private readonly providerKeys;
    private readonly entitlements;
    private readonly agentService;
    private readonly modelResolver;
    private readonly agentJobService;
    private readonly rateLimitService;
    private readonly idempotency;
    private readonly logger;
    constructor(ai: AiGatewayService, e2b: E2BService, providerKeys: ProviderKeysService, entitlements: EntitlementsService, agentService: AgentService, modelResolver: ModelResolverService, agentJobService: AgentJobService, rateLimitService: RateLimitService, idempotency: IdempotencyService);
    createAgentSession(user: User, body: Record<string, unknown>): Promise<{
        success: boolean;
        sessionId: string;
    }>;
    getAgentSession(user: User, sessionId: string): Promise<{
        success: boolean;
        session: AgentSessionData;
    }>;
    agentStream(user: User, body: Record<string, unknown>): Promise<{
        success: boolean;
        jobId: string | undefined;
        status: string;
    }>;
    cancelAgentJob(user: User, jobId: string): Promise<{
        success: boolean;
        cancelled: boolean;
        message: string;
    }>;
    subscribeToAgentStream(user: User, jobId: string, res: Response): Promise<void>;
    chat(user: User, body: ChatDto, res: Response): Promise<void>;
    applyAiCodeStream(_user: User, body: {
        response?: string;
        sandboxId?: string;
        packages?: string[];
        idempotencyKey?: string;
    }, res: Response): Promise<void>;
    codeComponent(user: User, body: CodeComponentDto): Promise<{
        code: string;
    }>;
    codePage(user: User, body: CodePageDto): Promise<{
        code: string;
    }>;
    designTokens(user: User, body: DesignTokensDto): Promise<Record<string, unknown>>;
    specSummarize(user: User, body: SummarizeSpecDto): Promise<Record<string, unknown>>;
    uiUxBlueprint(user: User, body: UiUxBlueprintDto): Promise<Record<string, unknown>>;
    filePlan(user: User, body: FilePlanDto): Promise<{
        files: import("@/types").FilePlanEntry[];
    }>;
    analyzeEditIntent(user: User, body: AnalyzeEditIntentDto): Promise<{
        success: boolean;
        search_plan: import("@/types").SearchPlan;
    }>;
    private fetchUserCredentials;
    private parseFiles;
    private validateResumeReview;
    private validatePrompt;
}
