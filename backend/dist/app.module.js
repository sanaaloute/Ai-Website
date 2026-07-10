"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_module_1 = require("./lib/core.module");
const agent_module_1 = require("./modules/agent/agent.module");
const sandbox_module_1 = require("./modules/sandbox/sandbox.module");
const e2b_module_1 = require("./modules/e2b/e2b.module");
const project_module_1 = require("./modules/project/project.module");
const integration_module_1 = require("./modules/integration/integration.module");
const billing_module_1 = require("./modules/billing/billing.module");
const profile_module_1 = require("./modules/profile/profile.module");
const util_module_1 = require("./modules/util/util.module");
const health_module_1 = require("./modules/health/health.module");
const auth_module_1 = require("./modules/auth/auth.module");
const admin_module_1 = require("./modules/admin/admin.module");
const pocketbase_module_1 = require("./modules/pocketbase/pocketbase.module");
const job_queue_module_1 = require("./modules/job-queue/job-queue.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env', '.env'] }),
            core_module_1.CoreModule,
            agent_module_1.AgentModule,
            sandbox_module_1.SandboxModule,
            e2b_module_1.E2BModule,
            project_module_1.ProjectModule,
            integration_module_1.IntegrationModule,
            billing_module_1.BillingModule,
            profile_module_1.ProfileModule,
            util_module_1.UtilModule,
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            admin_module_1.AdminModule,
            pocketbase_module_1.PocketbaseModule,
            job_queue_module_1.JobQueueModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map