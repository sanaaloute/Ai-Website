"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreModule = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("./supabase.service");
const e2b_service_1 = require("./e2b.service");
const paddle_service_1 = require("./paddle.service");
const ai_gateway_service_1 = require("./ai-gateway.service");
const storage_service_1 = require("./storage.service");
const encryption_service_1 = require("./encryption.service");
const integration_token_service_1 = require("./integration-token.service");
const github_service_1 = require("./github.service");
const vercel_service_1 = require("./vercel.service");
const deploy_service_1 = require("./deploy/deploy.service");
const docker_runner_1 = require("./deploy/docker.runner");
const coolify_runner_1 = require("./deploy/coolify.runner");
const redis_service_1 = require("./redis.service");
const sandbox_state_service_1 = require("./sandbox-state.service");
const idempotency_service_1 = require("./idempotency.service");
const cookie_service_1 = require("./cookie.service");
const prisma_service_1 = require("./prisma.service");
const provider_keys_service_1 = require("../modules/profile/provider-keys.service");
const entitlements_service_1 = require("../modules/billing/entitlements.service");
let CoreModule = class CoreModule {
};
exports.CoreModule = CoreModule;
exports.CoreModule = CoreModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [supabase_service_1.SupabaseService, e2b_service_1.E2BService, paddle_service_1.PaddleService, ai_gateway_service_1.AiGatewayService, storage_service_1.StorageService, github_service_1.GithubService, vercel_service_1.VercelService, deploy_service_1.DeployService, docker_runner_1.DockerDeployRunner, coolify_runner_1.CoolifyDeployRunner, redis_service_1.RedisService, sandbox_state_service_1.SandboxStateService, idempotency_service_1.IdempotencyService, cookie_service_1.CookieService, prisma_service_1.PrismaService, encryption_service_1.EncryptionService, integration_token_service_1.IntegrationTokenService, provider_keys_service_1.ProviderKeysService, entitlements_service_1.EntitlementsService],
        exports: [supabase_service_1.SupabaseService, e2b_service_1.E2BService, paddle_service_1.PaddleService, ai_gateway_service_1.AiGatewayService, storage_service_1.StorageService, github_service_1.GithubService, vercel_service_1.VercelService, deploy_service_1.DeployService, docker_runner_1.DockerDeployRunner, coolify_runner_1.CoolifyDeployRunner, redis_service_1.RedisService, sandbox_state_service_1.SandboxStateService, idempotency_service_1.IdempotencyService, cookie_service_1.CookieService, prisma_service_1.PrismaService, encryption_service_1.EncryptionService, integration_token_service_1.IntegrationTokenService, provider_keys_service_1.ProviderKeysService, entitlements_service_1.EntitlementsService],
    })
], CoreModule);
//# sourceMappingURL=core.module.js.map