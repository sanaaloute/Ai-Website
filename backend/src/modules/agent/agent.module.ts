import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentProcessor } from './agent.processor';
import { PromptLoaderService } from './services/prompt-loader.service';
import { ModelResolverService } from './services/model-resolver.service';
import { TemplateService } from './services/template.service';
import { AgentPersistenceService } from './services/agent-persistence.service';
import { AgentSchemaService } from './services/agent-schema.service';
import { DatabaseSeederService } from './services/database-seeder.service';
import { AgentMcpToolService } from './services/agent-mcp-tool.service';
import { McpModule } from '@/modules/mcp/mcp.module';
import { JobQueueModule } from '@/modules/job-queue/job-queue.module';
import { RateLimitService } from '@/common/guards/rate-limit.service';
import { AGENT_JOB_QUEUE } from '@/modules/job-queue/agent-job.service';

@Module({
  imports: [JobQueueModule, BullModule.registerQueue({ name: AGENT_JOB_QUEUE }), McpModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    AgentProcessor,
    PromptLoaderService,
    ModelResolverService,
    TemplateService,
    AgentPersistenceService,
    AgentSchemaService,
    DatabaseSeederService,
    AgentMcpToolService,
    RateLimitService,
  ],
})
export class AgentModule {}
