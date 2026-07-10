import { Module } from '@nestjs/common';
import { SandboxController } from './sandbox.controller';
import { SandboxService } from './sandbox.service';
import { SandboxLifecycleService } from './sandbox-lifecycle.service';

@Module({
  controllers: [SandboxController],
  providers: [SandboxService, SandboxLifecycleService],
})
export class SandboxModule {}
