import { Logger } from '@nestjs/common';
import { CompiledStateGraph } from '@langchain/langgraph';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { E2BService } from "../../lib/e2b.service";
import { AiGatewayService } from "../../lib/ai-gateway.service";
import { AgentState, AgentEvent } from './state';
import { PromptLoaderService } from './services/prompt-loader.service';
import { ModelResolverService } from './services/model-resolver.service';
import { TemplateService } from './services/template.service';
import { AgentPersistenceService } from './services/agent-persistence.service';
import { DatabaseSeederService } from './services/database-seeder.service';
import { AgentMcpToolService } from './services/agent-mcp-tool.service';
import type { TemplateCopyResult } from './nodes/template-selector.node';
export interface GraphDependencies {
    aiGateway: AiGatewayService;
    e2b: E2BService;
    promptLoader: PromptLoaderService;
    modelResolver: ModelResolverService;
    templateService: TemplateService;
    persistence: AgentPersistenceService;
    databaseSeeder: DatabaseSeederService;
    agentMcpToolService: AgentMcpToolService;
    logger: Logger;
    emit: (event: AgentEvent) => void | Promise<void>;
    signal?: AbortSignal;
    templateCopy: {
        current?: {
            category: string;
            promise: Promise<TemplateCopyResult>;
        };
    };
}
export declare function buildAgentGraph(checkpointer?: BaseCheckpointSaver): CompiledStateGraph<AgentState, Partial<AgentState>>;
