"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const agent_controller_1 = require("./agent.controller");
const agent_service_1 = require("./agent.service");
const agent_processor_1 = require("./agent.processor");
const prompt_loader_service_1 = require("./services/prompt-loader.service");
const model_resolver_service_1 = require("./services/model-resolver.service");
const template_service_1 = require("./services/template.service");
const agent_persistence_service_1 = require("./services/agent-persistence.service");
const agent_schema_service_1 = require("./services/agent-schema.service");
const database_seeder_service_1 = require("./services/database-seeder.service");
const agent_mcp_tool_service_1 = require("./services/agent-mcp-tool.service");
const mcp_module_1 = require("../mcp/mcp.module");
const job_queue_module_1 = require("../job-queue/job-queue.module");
const rate_limit_service_1 = require("../../common/guards/rate-limit.service");
const agent_job_service_1 = require("../job-queue/agent-job.service");
let AgentModule = class AgentModule {
};
exports.AgentModule = AgentModule;
exports.AgentModule = AgentModule = __decorate([
    (0, common_1.Module)({
        imports: [job_queue_module_1.JobQueueModule, bullmq_1.BullModule.registerQueue({ name: agent_job_service_1.AGENT_JOB_QUEUE }), mcp_module_1.McpModule],
        controllers: [agent_controller_1.AgentController],
        providers: [
            agent_service_1.AgentService,
            agent_processor_1.AgentProcessor,
            prompt_loader_service_1.PromptLoaderService,
            model_resolver_service_1.ModelResolverService,
            template_service_1.TemplateService,
            agent_persistence_service_1.AgentPersistenceService,
            agent_schema_service_1.AgentSchemaService,
            database_seeder_service_1.DatabaseSeederService,
            agent_mcp_tool_service_1.AgentMcpToolService,
            rate_limit_service_1.RateLimitService,
        ],
    })
], AgentModule);
//# sourceMappingURL=agent.module.js.map