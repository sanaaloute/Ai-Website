import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { E2BService } from './e2b.service';
import { StripeService } from './stripe.service';
import { AiGatewayService } from './ai-gateway.service';
import { StorageService } from './storage.service';
import { EncryptionService } from './encryption.service';
import { IntegrationTokenService } from './integration-token.service';
import { GithubService } from './github.service';
import { VercelService } from './vercel.service';
import { DeployService } from './deploy/deploy.service';
import { DockerDeployRunner } from './deploy/docker.runner';
import { CoolifyDeployRunner } from './deploy/coolify.runner';

import { RedisService } from './redis.service';
import { SandboxStateService } from './sandbox-state.service';
import { IdempotencyService } from './idempotency.service';
import { CookieService } from './cookie.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [SupabaseService, E2BService, StripeService, AiGatewayService, StorageService, GithubService, VercelService, DeployService, DockerDeployRunner, CoolifyDeployRunner, RedisService, SandboxStateService, IdempotencyService, CookieService, PrismaService, EncryptionService, IntegrationTokenService],
  exports: [SupabaseService, E2BService, StripeService, AiGatewayService, StorageService, GithubService, VercelService, DeployService, DockerDeployRunner, CoolifyDeployRunner, RedisService, SandboxStateService, IdempotencyService, CookieService, PrismaService, EncryptionService, IntegrationTokenService],
})
export class CoreModule {}
