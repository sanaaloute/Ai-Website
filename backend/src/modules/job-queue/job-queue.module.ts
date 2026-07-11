import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { env } from '@/config/env';
import { AgentJobService, AGENT_JOB_QUEUE } from './agent-job.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: env().redisUrl,
      },
    }),
    BullModule.registerQueue({
      name: AGENT_JOB_QUEUE,
    }),
  ],
  providers: [AgentJobService],
  exports: [AgentJobService, BullModule],
})
export class JobQueueModule {}
