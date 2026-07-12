"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobQueueModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const env_1 = require("../../config/env");
const agent_job_service_1 = require("./agent-job.service");
let JobQueueModule = class JobQueueModule {
};
exports.JobQueueModule = JobQueueModule;
exports.JobQueueModule = JobQueueModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.forRoot({
                connection: {
                    url: (0, env_1.env)().redisUrl,
                },
            }),
            bullmq_1.BullModule.registerQueue({
                name: agent_job_service_1.AGENT_JOB_QUEUE,
            }),
        ],
        providers: [agent_job_service_1.AgentJobService],
        exports: [agent_job_service_1.AgentJobService, bullmq_1.BullModule],
    })
], JobQueueModule);
//# sourceMappingURL=job-queue.module.js.map