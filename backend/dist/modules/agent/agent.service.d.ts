import { E2BService } from "../../lib/e2b.service";
import { AiGatewayService } from "../../lib/ai-gateway.service";
import { SupabaseService } from "../../lib/supabase.service";
import { AgentEvent } from './state';
import { PromptContent } from "../../types";
import { PromptLoaderService } from './services/prompt-loader.service';
import { ModelResolverService } from './services/model-resolver.service';
import { TemplateService } from './services/template.service';
import { AgentPersistenceService } from './services/agent-persistence.service';
import { DatabaseSeederService } from './services/database-seeder.service';
import { AgentMcpToolService } from './services/agent-mcp-tool.service';
export interface StreamOptions {
    userId: string;
    prompt: PromptContent;
    sandboxId: string;
    projectId?: string;
    chatHistory?: Array<{
        role: string;
        content: string;
    }>;
    resumeReview?: {
        issues: string[];
        todos?: {
            id: string;
            content: string;
            status: string;
        }[];
    };
    threadId?: string;
    resume?: boolean;
    signal?: AbortSignal;
}
export declare class AgentService {
    private readonly aiGateway;
    private readonly e2b;
    private readonly supabase;
    private readonly promptLoader;
    private readonly modelResolver;
    private readonly templateService;
    private readonly persistence;
    private readonly databaseSeeder;
    private readonly agentMcpToolService;
    private readonly logger;
    private readonly graph;
    constructor(aiGateway: AiGatewayService, e2b: E2BService, supabase: SupabaseService, promptLoader: PromptLoaderService, modelResolver: ModelResolverService, templateService: TemplateService, persistence: AgentPersistenceService, databaseSeeder: DatabaseSeederService, agentMcpToolService: AgentMcpToolService);
    stream(options: StreamOptions, onEvent: (event: AgentEvent) => void | Promise<void>): AsyncGenerator<AgentEvent>;
    private fetchUserApiKey;
}
