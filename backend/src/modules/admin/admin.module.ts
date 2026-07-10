import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAgentService } from './admin-agent.service';
import { AdminAuthGuard } from './admin.guard';
import { JobQueueModule } from '@/modules/job-queue/job-queue.module';

@Module({
  imports: [JobQueueModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAgentService, AdminAuthGuard],
  exports: [AdminService, AdminAgentService, AdminAuthGuard],
})
export class AdminModule {}
