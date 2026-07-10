import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { RedisService } from '@/lib/redis.service';
import { AgentEvent } from '@/modules/agent/state';
import { PromptContent } from '@/types';

export const AGENT_JOB_QUEUE = 'agent-jobs';
export const AGENT_JOB_EVENT_CHANNEL = (jobId: string) => `agent:job:${jobId}:events`;
export const AGENT_JOB_CANCEL_KEY = (jobId: string) => `agent:job:${jobId}:cancelled`;

export interface AgentJobData {
  sessionId: string;
  userId: string;
  sandboxId: string;
  projectId?: string;
  threadId?: string;
  resume?: boolean;
  resumeReview?: {
    issues: string[];
    todos?: Array<{ id: string; content: string; status: string }>;
  };
  chatHistory?: Array<{ role: string; content: string }>;
  prompt?: PromptContent;
}

export interface AgentSessionData {
  prompt?: PromptContent;
  templateRepo?: string;
  templatePrompt?: string;
  projectName?: string;
  userId: string;
}

@Injectable()
export class AgentJobService {
  private readonly logger = new Logger(AgentJobService.name);

  constructor(
    @InjectQueue(AGENT_JOB_QUEUE) private readonly agentQueue: Queue<AgentJobData>,
    private readonly redis: RedisService,
  ) {}

  /**
   * Creates an opaque generation session. The prompt and template selection
   * live server-side so that refreshes, private browsing, and cross-tab
   * navigation never lose the user's intent.
   */
  async createSession(
    userId: string,
    data: Omit<AgentSessionData, 'userId'>,
    ttlSeconds = 86400,
  ): Promise<string> {
    const sessionId = crypto.randomUUID();
    const session: AgentSessionData = { ...data, userId };
    await this.redis.getClient().setex(
      `agent:session:${sessionId}`,
      ttlSeconds,
      JSON.stringify(session),
    );
    return sessionId;
  }

  async getSession(sessionId: string): Promise<AgentSessionData | null> {
    const raw = await this.redis.getClient().get(`agent:session:${sessionId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AgentSessionData;
    } catch (e) {
      this.logger.error(`Failed to parse session ${sessionId}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.getClient().del(`agent:session:${sessionId}`);
  }

  /**
   * Enqueues an agent generation job. Returns the BullMQ job id, which is
   * also used as the SSE subscription id.
   */
  async enqueue(data: AgentJobData, idempotencyKey?: string): Promise<Job<AgentJobData>> {
    const job = await this.agentQueue.add(AGENT_JOB_QUEUE, data, {
      jobId: idempotencyKey,
      removeOnComplete: { age: 3600, count: 100 },
      removeOnFail: { age: 3600, count: 100 },
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    });
    return job;
  }

  async getJob(jobId: string): Promise<Job<AgentJobData> | undefined> {
    return this.agentQueue.getJob(jobId);
  }

  /**
   * Marks a job as cancelled and removes it from the queue if it is still
   * waiting. Active jobs will detect the cancellation flag on their next
   * event boundary and stop gracefully.
   */
  async cancel(jobId: string): Promise<boolean> {
    const client = this.redis.getClient();
    await client.setex(AGENT_JOB_CANCEL_KEY(jobId), 3600, '1');

    const job = await this.getJob(jobId);
    if (!job) return false;

    const state = await job.getState();
    const removableStates = new Set(['waiting', 'delayed', 'paused', 'prioritized', 'waiting-children']);
    if (removableStates.has(state as string)) {
      await job.remove();
      return true;
    }

    return state === 'active';
  }

  async isCancelled(jobId: string): Promise<boolean> {
    const result = await this.redis.getClient().get(AGENT_JOB_CANCEL_KEY(jobId));
    return result === '1';
  }

  async clearCancellation(jobId: string): Promise<void> {
    await this.redis.getClient().del(AGENT_JOB_CANCEL_KEY(jobId));
  }

  async getQueueMetrics(): Promise<{
    counts: Record<string, number>;
    active: Array<{ id?: string; userId: string; sandboxId: string; projectId?: string; progress: number }>;
    waiting: Array<{ id?: string; userId: string; sandboxId: string; projectId?: string; progress: number }>;
  }> {
    const counts = await this.agentQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
    const [activeJobs, waitingJobs] = await Promise.all([
      this.agentQueue.getJobs('active', 0, 49, true),
      this.agentQueue.getJobs('waiting', 0, 49, true),
    ]);

    const mapJob = (j: Job<AgentJobData>) => ({
      id: j.id,
      userId: j.data.userId,
      sandboxId: j.data.sandboxId,
      projectId: j.data.projectId,
      progress: typeof j.progress === 'number' ? j.progress : 0,
    });

    return {
      counts,
      active: activeJobs.map(mapJob),
      waiting: waitingJobs.map(mapJob),
    };
  }

  /**
   * Publishes an agent event to the job's Redis pub/sub channel so that any
   * SSE subscriber (possibly on a different pod) can forward it to the user.
   */
  async publishEvent(jobId: string, event: AgentEvent): Promise<void> {
    const channel = AGENT_JOB_EVENT_CHANNEL(jobId);
    await this.redis.getClient().publish(channel, JSON.stringify(event));
  }

  /**
   * Subscribes to job events and invokes the callback for each event.
   * Returns an unsubscribe function. The caller is responsible for closing
   * the SSE response when done.
   */
  subscribeToEvents(
    jobId: string,
    onEvent: (event: AgentEvent) => void,
  ): { unsubscribe: () => void } {
    const subscriber = this.redis.getSubscriber();
    const channel = AGENT_JOB_EVENT_CHANNEL(jobId);

    const handler = (message: string) => {
      try {
        const event = JSON.parse(message) as AgentEvent;
        onEvent(event);
      } catch (e) {
        this.logger.warn(`Malformed event on ${channel}: ${e instanceof Error ? e.message : String(e)}`);
      }
    };

    const messageListener = (receivedChannel: string, message: string) => {
      if (receivedChannel === channel) {
        handler(message);
      }
    };

    subscriber.subscribe(channel, (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to ${channel}: ${err.message}`);
      }
    });
    subscriber.on('message', messageListener);

    return {
      unsubscribe: () => {
        subscriber.off('message', messageListener);
        subscriber.unsubscribe(channel).catch(() => {
          // Best-effort cleanup.
        });
        this.redis.releaseSubscriber(subscriber);
      },
    };
  }
}
