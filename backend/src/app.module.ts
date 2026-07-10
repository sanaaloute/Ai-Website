import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CoreModule } from './lib/core.module';

import { AgentModule } from './modules/agent/agent.module';
import { SandboxModule } from './modules/sandbox/sandbox.module';
import { E2BModule } from './modules/e2b/e2b.module';
import { ProjectModule } from './modules/project/project.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { BillingModule } from './modules/billing/billing.module';
import { ProfileModule } from './modules/profile/profile.module';
import { UtilModule } from './modules/util/util.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { PocketbaseModule } from './modules/pocketbase/pocketbase.module';
import { JobQueueModule } from './modules/job-queue/job-queue.module';

@Module({
  imports: [
    // Single source of truth: the repo-root `.env`. Loaded first so every app
    // (backend / frontend / admin) shares one file. A per-app `.env` can still
    // override for app-specific tweaks.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env', '.env'] }),
    CoreModule,
    AgentModule,
    SandboxModule,
    E2BModule,
    ProjectModule,
    IntegrationModule,
    BillingModule,
    ProfileModule,
    UtilModule,
    HealthModule,
    AuthModule,
    AdminModule,
    PocketbaseModule,
    JobQueueModule,
  ],
})
export class AppModule {}
