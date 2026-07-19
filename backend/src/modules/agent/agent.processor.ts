import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AgentService, StreamOptions } from '@/modules/agent/agent.service';
import { AgentJobService, AGENT_JOB_QUEUE, AgentJobData } from '@/modules/job-queue/agent-job.service';
import { RateLimitService } from '@/common/guards/rate-limit.service';
import { AgentEvent } from './state';
import { env } from '@/config/env';


// Concurrency is read straight from process.env (not env()) because decorator
// arguments evaluate at module-load time, before any validation chain runs.
const WORKER_CONCURRENCY = parseInt(process.env.AGENT_WORKER_CONCURRENCY ?? '4', 10);

@Processor(AGENT_JOB_QUEUE, {
  concurrency: WORKER_CONCURRENCY,
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
      // Deterministic thread id across attempts so a retried job resumes from
      // the checkpoint written by the failed attempt instead of re-running the
      // whole graph from scratch (agent.service falls back to a fresh run when
      // no checkpoint exists yet).
      threadId: threadId ?? `agent-job-${job.id}`,
      resume: resume || job.attemptsMade > 0,
      chatHistory,
      resumeReview,
    };

    let cancellationPoller: NodeJS.Timeout | undefined;
    let jobTimeout: NodeJS.Timeout | undefined;
    let jobTimedOut = false;

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

      // Hard ceiling for the whole job (AGENT_JOB_TIMEOUT_MS, default 30min).
      // BullMQ v5 has no job-level `timeout` option, and a wedged LLM stream
      // would otherwise hold one of the few worker slots forever. Uses the
      // same AbortController as user cancellation; the `jobTimedOut` flag
      // keeps the two distinguishable for error reporting.
      jobTimeout = setTimeout(() => {
        jobTimedOut = true;
        this.logger.error(
          `Agent job ${job.id} exceeded AGENT_JOB_TIMEOUT_MS (${env().agentJobTimeoutMs}ms) — aborting`,
        );
        abortController.abort();
      }, env().agentJobTimeoutMs);

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
      if (jobTimeout) clearTimeout(jobTimeout);

      // A job-timeout abort is swallowed by agent.service.stream() (it emits
      // error+done events and returns normally), so detect it here — otherwise
      // a 30-minute timeout would fall through and be reported as 'completed',
      // and BullMQ would never retry the wedged job.
      if (jobTimedOut) {
        const message = `Agent job timed out after ${env().agentJobTimeoutMs}ms`;
        await publisher({ type: 'error', data: { message } });
        await this.rateLimitService.releaseConcurrentGeneration(userId, job.id!);
        throw new Error(message);
      }

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
      if (jobTimeout) clearTimeout(jobTimeout);
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Agent job ${job.id} failed: ${message}`);
      await this.rateLimitService.releaseConcurrentGeneration(userId, job.id!);
      // A job-timeout abort surfaces as a CancelledError from the stream —
      // rethrow an honest error so retries/DLQ logs aren't mislabeled.
      if (jobTimedOut) {
        throw new Error(`Agent job timed out after ${env().agentJobTimeoutMs}ms`);
      }
      throw e;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<AgentJobData> | undefined, error: Error) {
    this.logger.error(`Agent job ${job?.id} failed permanently: ${error.message}`);
    if (job) {
      // Structured DLQ-style marker: jobs that exhausted all attempts land
      // here. Ops alerting can hook on this exact log line until a real DLQ
      // queue is introduced.
      this.logger.error(
        `[dlq] agent job ${job.id} dead-lettered after ${job.attemptsMade} attempt(s) ` +
          `(user ${job.data.userId}, sandbox ${job.data.sandboxId}): ${error.message}`,
      );
      void this.rateLimitService.releaseConcurrentGeneration(job.data.userId, job.id!);
    }
  }

  @OnWorkerEvent('stalled')
  onStalled(job: Job<AgentJobData> | undefined) {
    // A stalled job (worker crash / event-loop block) leaves its
    // concurrent-generation slot occupied; release it so the user isn't
    // blocked until the 24h Redis TTL cleans up.
    if (job) {
      this.logger.warn(`Agent job ${job.id} stalled — releasing concurrency slot`);
      void this.rateLimitService.releaseConcurrentGeneration(job.data.userId, job.id!);
    }
  }
}
