import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AgentService, StreamOptions } from '@/modules/agent/agent.service';
import { AgentJobService, AGENT_JOB_QUEUE, AgentJobData } from '@/modules/job-queue/agent-job.service';
import { RateLimitService } from '@/common/guards/rate-limit.service';
import { AgentEvent } from './state';
import { env } from '@/config/env';
import { JobTimeoutError } from '@/lib/cancellation';


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
        // Tagged reason so downstream layers can tell a job-timeout abort
        // apart from a user cancel (an untagged abort() looks identical).
        abortController.abort(new JobTimeoutError(`Agent job timed out after ${env().agentJobTimeoutMs}ms`));
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

      if (wasCancelled) {
        const cancelEvent: AgentEvent = { type: 'error', data: { message: 'Cancelled by user' } };
        const doneEvent: AgentEvent = { type: 'done', data: {} };
        await publisher(cancelEvent);
        await publisher(doneEvent);
        await this.rateLimitService.releaseConcurrentGeneration(userId, job.id!);
        this.logger.log(`Agent job ${job.id} cancelled by user`);
        return { status: 'cancelled' };
      }

      // Safety net: agent.service rethrows timeout/graph errors, so a stream
      // that still returned normally after a job-timeout abort would be a bug —
      // fail the job here rather than report it as 'completed'.
      if (jobTimedOut) {
        await this.failJob(job, userId, `Agent job timed out after ${env().agentJobTimeoutMs}ms`, publisher);
      }

      await job.updateProgress({ status: 'completed', previewUrl: finalPreviewUrl, finalResponse });
      await this.rateLimitService.releaseConcurrentGeneration(userId, job.id!);

      return { status: 'completed', previewUrl: finalPreviewUrl };
    } catch (e) {
      if (cancellationPoller) clearInterval(cancellationPoller);
      if (jobTimeout) clearTimeout(jobTimeout);
      const message = jobTimedOut
        ? `Agent job timed out after ${env().agentJobTimeoutMs}ms`
        : e instanceof Error ? e.message : String(e);
      this.logger.error(`Agent job ${job.id} failed: ${message}`);
      return await this.failJob(job, userId, message, publisher);
    }
  }

  /**
   * Shared failure path: releases the concurrency slot, then tells the USER
   * the truth in the right shape — a `status` "resuming" event when BullMQ
   * will retry (an `error` event would close the SSE connection and strand
   * the frontend while the next attempt runs), or a final `error` event when
   * attempts are exhausted. Always throws so the job is marked failed.
   */
  private async failJob(
    job: Job<AgentJobData>,
    userId: string,
    message: string,
    publisher: (event: AgentEvent) => Promise<void>,
  ): Promise<never> {
    await this.rateLimitService.releaseConcurrentGeneration(userId, job.id!);
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) {
      await publisher({
        type: 'status',
        data: {
          status: 'retrying',
          message: `${message} — resuming from checkpoint (attempt ${job.attemptsMade + 1}/${maxAttempts})...`,
        },
      });
    } else {
      await publisher({ type: 'error', data: { message } });
    }
    throw new Error(message);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<AgentJobData> | undefined, error: Error) {
    if (!job) {
      this.logger.error(`Agent job failed: ${error.message}`);
      return;
    }
    // BullMQ fires 'failed' on EVERY failed attempt, not just the last one —
    // only treat it as dead-lettered when attempts are actually exhausted.
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(`Agent job ${job.id} failed permanently: ${error.message}`);
      // Structured DLQ-style marker: jobs that exhausted all attempts land
      // here. Ops alerting can hook on this exact log line until a real DLQ
      // queue is introduced.
      this.logger.error(
        `[dlq] agent job ${job.id} dead-lettered after ${job.attemptsMade} attempt(s) ` +
          `(user ${job.data.userId}, sandbox ${job.data.sandboxId}): ${error.message}`,
      );
    } else {
      this.logger.warn(
        `Agent job ${job.id} failed on attempt ${job.attemptsMade}/${maxAttempts} — will retry: ${error.message}`,
      );
    }
    void this.rateLimitService.releaseConcurrentGeneration(job.data.userId, job.id!);
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
