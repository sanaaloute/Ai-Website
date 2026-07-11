import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { E2BService } from '@/lib/e2b.service';
import { AiGatewayService } from '@/lib/ai-gateway.service';
import { SupabaseService } from '@/lib/supabase.service';
import { AgentState, AgentEvent } from './state';
import { PromptContent } from '@/types';
import { buildAgentGraph, GraphDependencies } from './graph';
import { PromptLoaderService } from './services/prompt-loader.service';
import { ModelResolverService } from './services/model-resolver.service';
import { TemplateService } from './services/template.service';
import { AgentPersistenceService } from './services/agent-persistence.service';
import { DatabaseSeederService } from './services/database-seeder.service';
import { AgentMcpToolService } from './services/agent-mcp-tool.service';

export interface StreamOptions {
  userId: string;
  prompt: PromptContent;
  sandboxId: string;
  projectId?: string;
  chatHistory?: Array<{ role: string; content: string }>;
  resumeReview?: {
    issues: string[];
    todos?: { id: string; content: string; status: string }[];
  };
  threadId?: string;
  resume?: boolean;
  signal?: AbortSignal;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly graph: ReturnType<typeof buildAgentGraph>;

  constructor(
    private readonly aiGateway: AiGatewayService,
    private readonly e2b: E2BService,
    private readonly supabase: SupabaseService,
    private readonly promptLoader: PromptLoaderService,
    private readonly modelResolver: ModelResolverService,
    private readonly templateService: TemplateService,
    private readonly persistence: AgentPersistenceService,
    private readonly databaseSeeder: DatabaseSeederService,
    private readonly agentMcpToolService: AgentMcpToolService,
  ) {
    this.graph = buildAgentGraph(this.persistence);
  }

  async *stream(
    options: StreamOptions,
    onEvent: (event: AgentEvent) => void | Promise<void>,
  ): AsyncGenerator<AgentEvent> {
    const userApiKey = await this.fetchUserApiKey(options.userId);

    const initialState: AgentState = {
      prompt: options.prompt,

      sandboxId: options.sandboxId,
      projectId: options.projectId,
      userId: options.userId,
      chatHistory: options.chatHistory ?? [],
      userApiKey,
      retryCount: 0,

      // When the user chooses to continue after the review retry loop hits the
      // human-in-the-loop limit, skip analyzer/planner and jump straight into the
      // executor→reviewer loop with the unresolved issues and reviewer-created todos.
      ...(options.resumeReview
        ? {
            workflow: 'review_fix' as const,
            reviewIssues: options.resumeReview.issues,
            reviewTodos: options.resumeReview.todos,
            todos: options.resumeReview.todos,
          }
        : {}),
    } as AgentState;

    const emit = async (event: AgentEvent) => {
      await onEvent(event);
    };

    const deps: GraphDependencies = {
      aiGateway: this.aiGateway,
      e2b: this.e2b,
      promptLoader: this.promptLoader,
      modelResolver: this.modelResolver,
      templateService: this.templateService,
      persistence: this.persistence,
      databaseSeeder: this.databaseSeeder,
      agentMcpToolService: this.agentMcpToolService,
      logger: this.logger,
      emit,
    };

    const threadId = options.threadId ?? `agent-${options.userId ?? 'anon'}-${randomUUID()}`;
    let finalResponse = '';
    const runningState: Partial<AgentState> = options.resume
      ? {}
      : { ...initialState };

    let generationId = await this.persistence.startGeneration({
      userId: options.userId,
      projectId: options.projectId,
      threadId,
      prompt: typeof options.prompt === 'string' ? options.prompt : JSON.stringify(options.prompt),
      workflow: initialState.workflow,
    });

    // If the audit-log write failed (e.g. schema mismatch), fall back to a
    // generated id so the atomic snapshot/rollback path still works. We never
    // skip the pre-generation snapshot — that is a hard P1 requirement.
    const snapshotId = generationId ?? randomUUID();

    // Take an atomic workspace snapshot before mutating anything. This gives
    // the user a revert path if the generation fails or goes off the rails.
    try {
      await this.e2b.snapshotSandbox(options.sandboxId, snapshotId);
      const snapshotEvent: AgentEvent = {
        type: 'snapshot',
        data: { snapshotId, sandboxId: options.sandboxId },
      };
      await emit(snapshotEvent);
      yield snapshotEvent;
    } catch (snapshotErr) {
      const snapshotMessage = snapshotErr instanceof Error ? snapshotErr.message : String(snapshotErr);
      this.logger.warn(`Failed to snapshot sandbox before generation: ${snapshotMessage}`);
    }

    try {
      // When resuming, pass null input so LangGraph loads the latest checkpoint
      // state for the thread and continues from where it left off.
      const stream = await this.graph.stream(options.resume ? null : initialState, {
        streamMode: 'updates',
        configurable: { deps, thread_id: threadId },
        recursionLimit: 50,
      });

      for await (const chunk of stream) {
        if (options.signal?.aborted) {
          throw new Error('Cancelled by user');
        }

        const { nodeName, update } = parseUpdateChunk(chunk);
        if (!nodeName) continue;

        // Accumulate state so we can check the current retry count when the
        // reviewer reports a failure.
        Object.assign(runningState, update);

        const message =
          update.messages?.[update.messages.length - 1]?.content || `Step ${nodeName}`;

        if (update.summary && typeof update.summary === 'string') {
          finalResponse = update.summary;
        }

        const statusEvent: AgentEvent = {
          type: 'status',
          data: { status: mapNodeToStatus(nodeName), message },
        };
        await emit(statusEvent);
        yield statusEvent;

        if (update.todos) {
          const ev: AgentEvent = { type: 'todos_update', data: { todos: update.todos } };
          await emit(ev);
          yield ev;
        }

        if (nodeName === 'executor' && update.filesWritten) {
          for (const fw of update.filesWritten) {
            const content = fw.content ?? '';
            const ev: AgentEvent = {
              type: 'file_update',
              data: {
                path: fw.path,
                status: fw.status,
                size: content.length,
                lineCount: content.split('\n').length,
              },
            };
            await emit(ev);
            yield ev;
          }
        }

        if (nodeName === 'reviewer') {
          const ev: AgentEvent = {
            type: 'review',
            data: {
              passed: update.reviewPassed ?? true,
              issues: update.reviewIssues ?? [],
              suggestions: update.reviewSuggestions ?? [],
            },
          };
          await emit(ev);
          yield ev;

          // After 3 failed review attempts, stop the loop and ask the user whether
          // to keep trying. Emitting this event lets the UI show a human-in-the-loop
          // card with the remaining issues and reviewer-created todos.
          if (
            update.reviewPassed === false &&
            (runningState.retryCount ?? 0) >= 3
          ) {
            const maxReachedEvent: AgentEvent = {
              type: 'review_max_reached',
              data: {
                issues: update.reviewIssues ?? [],
                todos: update.reviewTodos ?? [],
              },
            };
            await emit(maxReachedEvent);
            yield maxReachedEvent;
          }
        }

        if (nodeName === 'finalize') {
          const ev: AgentEvent = {
            type: 'preview',
            data: { url: update.previewUrl || null },
          };
          await emit(ev);
          yield ev;
        }
      }

      const doneEvent: AgentEvent = {
        type: 'done',
        data: { finalResponse, snapshotId },
      };
      await emit(doneEvent);
      yield doneEvent;

      if (generationId) {
        await this.persistence.finishGeneration({
          generationId,
          threadId,
          status: 'completed',
          summary: finalResponse,
          previewUrl: runningState.previewUrl,
          state: runningState,
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Graph execution error: ${message}`);
      const errorEvent: AgentEvent = { type: 'error', data: { message } };
      await emit(errorEvent);
      yield errorEvent;
      const doneEvent: AgentEvent = { type: 'done', data: { finalResponse, snapshotId } };
      await emit(doneEvent);
      yield doneEvent;

      if (generationId) {
        await this.persistence.finishGeneration({
          generationId,
          threadId,
          status: 'failed',
          error: message,
          state: runningState,
        });
      }
    }
  }

  private async fetchUserApiKey(userId: string): Promise<string | undefined> {
    try {
      const profile = await this.supabase.getProfile(userId);
      const key = profile?.ai_website_api_key;
      return typeof key === 'string' && key.length > 0 ? key : undefined;
    } catch (e) {
      this.logger.warn(
        `Could not fetch user API key: ${e instanceof Error ? e.message : String(e)}`,
      );
      return undefined;
    }
  }
}

function parseUpdateChunk(chunk: unknown): {
  nodeName: string | undefined;
  update: Partial<AgentState>;
} {
  let payload: Record<string, unknown>;

  if (Array.isArray(chunk)) {
    // streamMode array shape: [mode, payload]
    payload = (chunk[1] as Record<string, unknown>) ?? {};
  } else if (chunk && typeof chunk === 'object') {
    payload = chunk as Record<string, unknown>;
  } else {
    return { nodeName: undefined, update: {} };
  }

  const keys = Object.keys(payload);
  if (keys.length === 0) {
    return { nodeName: undefined, update: {} };
  }

  const nodeName = keys[0];
  const update = (payload[nodeName] as Partial<AgentState>) ?? {};
  return { nodeName, update };
}

function mapNodeToStatus(nodeName: string): string {
  switch (nodeName) {
    case 'coordinator':
    case 'analyzer':
    case 'template_selector':
      return 'analyzing';
    case 'planner':
    case 'pre_flight_validator':
      return 'planning';
    case 'executor':
    case 'file_state_tracker':
    case 'answer_generator':
      return 'executing';
    case 'reviewer':
      return 'reviewing';
    case 'debugger':
    case 'increment_retry':
      return 'debugging';
    case 'finalize':
      return 'finalizing';
    default:
      return nodeName;
  }
}
