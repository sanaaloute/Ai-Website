import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AgentService, StreamOptions } from '@/modules/agent/agent.service';
import { AgentJobService, AGENT_JOB_QUEUE, AgentJobData } from '@/modules/job-queue/agent-job.service';
import { RateLimitService } from '@/common/guards/rate-limit.service';
import { AgentEvent } from './state';


@Processor(AGENT_JOB_QUEUE, {
  concurrency: 4,
  limiter: {
    max: 10,
    duration: 1000,
  },
})
export class AgentProcessor extends WorkerHost {
  private readonly logger = new Logger(AgentProcessor.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly agentJobService: AgentJobService,
    private readonly rateLimitService: RateLimitService,
  ) {
    super();
  }

  async process(job: Job<AgentJobData>): Promise<{ status: string; previewUrl?: string | null; error?: string }> {
    const { userId, sandboxId, projectId, threadId, resume, resumeReview, chatHistory, prompt } = job.data;

    this.logger.log(`Processing agent job ${job.id} for user ${userId}, sandbox ${sandboxId}`);

    const publisher = async (event: AgentEvent) => {
      await this.agentJobService.publishEvent(job.id!, event);
    };

    const options: StreamOptions = {
      userId,
      prompt: prompt ?? '',
      sandboxId,
      projectId,
      threadId,
      resume,
      chatHistory,
      resumeReview,
    };

    let cancellationPoller: NodeJS.Timeout | undefined;

    try {
      let finalPreviewUrl: string | null = null;
      let finalResponse = '';
      let wasCancelled = false;

      // Clear any stale cancellation flag before starting, then check it on
      // every event boundary so the user can stop an engaged workflow.
      await this.agentJobService.clearCancellation(job.id!);

      const abortController = new AbortController();
      cancellationPoller = setInterval(async () => {
        if (await this.agentJobService.isCancelled(job.id!)) {
          abortController.abort();
        }
      }, 500);
      options.signal = abortController.signal;

      for await (const event of this.agentService.stream(options, publisher)) {
        if (await this.agentJobService.isCancelled(job.id!)) {
          wasCancelled = true;
          break;
        }

        if (event.type === 'preview') {
          finalPreviewUrl = typeof event.data.url === 'string' ? event.data.url : null;
        }
        if (event.type === 'done') {
          finalResponse = (event.data as { finalResponse?: string }).finalResponse ?? '';
        }
      }

      if (cancellationPoller) clearInterval(cancellationPoller);

      if (wasCancelled) {
        const cancelEvent: AgentEvent = { type: 'error', data: { message: 'Cancelled by user' } };
        const doneEvent: AgentEvent = { type: 'done', data: {} };
        await publisher(cancelEvent);
        await publisher(doneEvent);
        await this.rateLimitService.releaseConcurrentGeneration(userId, job.id!);
        this.logger.log(`Agent job ${job.id} cancelled by user`);
        return { status: 'cancelled' };
      }

      await job.updateProgress({ status: 'completed', previewUrl: finalPreviewUrl, finalResponse });
      await this.rateLimitService.releaseConcurrentGeneration(userId, job.id!);

      return { status: 'completed', previewUrl: finalPreviewUrl };
    } catch (e) {
      if (cancellationPoller) clearInterval(cancellationPoller);
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Agent job ${job.id} failed: ${message}`);
      await this.rateLimitService.releaseConcurrentGeneration(userId, job.id!);
      throw e;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<AgentJobData> | undefined, error: Error) {
    this.logger.error(`Agent job ${job?.id} failed permanently: ${error.message}`);
    if (job) {
      void this.rateLimitService.releaseConcurrentGeneration(job.data.userId, job.id!);
    }
  }
}
