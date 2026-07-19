import { useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import type { AgentStreamEvent, Todo, QuestionnaireQuestion, PlanData } from '@/lib/agent/types';
import { agentStream, extractPlanLimitError, subscribeAgentStream, getSandboxFile, restoreSandboxSnapshot, cancelAgentJob, getActiveAgentJob } from '@/lib/api/client';
import { useEntitlementsStore } from '@/stores/entitlementsStore';

export interface AgentStreamState {
  status: string;
  statusLabel: string;
  isRunning: boolean;
  files: Array<{
    path: string;
    content: string;
    type: string;
    completed: boolean;
    edited?: boolean;
  }>;
  /** The file currently being streamed (last file_update received). */
  currentFile: {
    path: string;
    content: string;
    type: string;
  } | null;
  todos: Todo[];
  review: {
    passed: boolean;
    issues: string[];
    suggestions: string[];
  } | null;
  reviewMaxReached: boolean;
  reviewMaxIssues: string[];
  reviewMaxTodos: Array<{ id: string; content: string; status: string }>;
  previewUrl: string | null;
  error: string | null;
  streamedText: string;
  commandLog: Array<{ tool: string; stream: 'stdout' | 'stderr'; chunk: string }>;
  toolProgress: { tool: string; message?: string; percent?: number } | null;
  questionnaire: {
    questions: QuestionnaireQuestion[];
  } | null;
  plan: PlanData | null;
  exitPlan: boolean;
  finalResponse: string | null;
  suggestions: string[];
  /**
   * Per-agent streamed output, in arrival order. Each agent (graph node) gets
   * one "thinking" step; code-writing streams get a separate "code" step
   * (rendered as the "Stream synthesis" card in the chat).
   */
  agentSteps: Array<{
    id: string;
    node: string;
    kind: 'thinking' | 'code';
    text: string;
    done: boolean;
  }>;
}

export interface UseAgentStreamOptions {
  apiKey?: string;
  onEvent?: (event: AgentStreamEvent) => void;
}

const AGENT_JOB_ID_KEY_PREFIX = 'ai-website:agentJobId:';

function readPersistedAgentJobId(sandboxId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(AGENT_JOB_ID_KEY_PREFIX + sandboxId);
  } catch {
    return null;
  }
}

function persistAgentJobId(sandboxId: string, jobId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(AGENT_JOB_ID_KEY_PREFIX + sandboxId, jobId);
  } catch {
    // ignore (private mode / quota)
  }
}

function clearPersistedAgentJobId(sandboxId: string | null): void {
  if (!sandboxId || typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(AGENT_JOB_ID_KEY_PREFIX + sandboxId);
  } catch {
    // ignore
  }
}

function createInitialAgentStreamState(statusLabel = 'Analyzing your request...'): AgentStreamState {
  return {
    status: 'analyzing',
    statusLabel,
    isRunning: true,
    files: [],
    currentFile: null,
    todos: [],
    review: null,
    reviewMaxReached: false,
    reviewMaxIssues: [],
    reviewMaxTodos: [],
    previewUrl: null,
    error: null,
    streamedText: '',
    commandLog: [],
    toolProgress: null,
    questionnaire: null,
    plan: null,
    exitPlan: false,
    finalResponse: null,
    suggestions: [],
    agentSteps: [],
  };
}

export function useAgentStream(options: UseAgentStreamOptions) {
  const abortRef = useRef<AbortController | null>(null);
  const sandboxIdRef = useRef<string | null>(null);
  const lastSnapshotIdRef = useRef<string | null>(null);
  const currentJobIdRef = useRef<string | null>(null);
  // One refresh re-attach attempt per sandbox per page load. send() also marks
  // its sandbox so a deliberate new job never races a resume.
  const resumeAttemptedForRef = useRef<string | null>(null);

  // Open an SSE subscription to the job and follow it to a terminal state. If
  // the stream stalls or the connection drops while the job is still running,
  // re-subscribe to the SAME job instead of failing — resubscribing is free (no
  // plan quota) and the worker keeps running in the background.
  const streamJobToCompletion = useCallback(
    async (
      jobId: string,
      state: AgentStreamState,
      onStateChange: (state: AgentStreamState) => void
    ): Promise<AgentStreamState> => {
      const MAX_RESUBSCRIBES = 5;
      let lastStreamError: unknown;
      for (let attempt = 0; attempt <= MAX_RESUBSCRIBES; attempt++) {
        if (attempt > 0) {
          state.isRunning = true;
          state.statusLabel = 'Reconnecting to generation...';
          onStateChange({ ...state });
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, 2000);
            abortRef.current?.signal.addEventListener(
              'abort',
              () => {
                clearTimeout(timer);
                reject(new DOMException('Aborted', 'AbortError'));
              },
              { once: true },
            );
          });
        }

        try {
          const response = await subscribeAgentStream(jobId, abortRef.current?.signal);

          if (!response.ok) {
            const data = (await response.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(data.error || `SSE error! status: ${response.status}`);
          }

          const finalState = await readAgentStream(response, state, onStateChange, options.onEvent, sandboxIdRef, lastSnapshotIdRef);

          // The stream only closes cleanly on a terminal event (done/error).
          // Anything else means the connection dropped mid-run — resubscribe.
          if (finalState.status === 'done' || finalState.status === 'error') {
            return finalState;
          }
          lastStreamError = new Error('Connection to generation lost');
          continue;
        } catch (streamErr) {
          if ((streamErr as Error).name === 'AbortError') {
            throw streamErr;
          }
          lastStreamError = streamErr;
          continue;
        }
      }

      throw lastStreamError instanceof Error
        ? lastStreamError
        : new Error('Generation stream stalled. Please retry or refresh.');
    },
    [options.onEvent]
  );

  const send = useCallback(
    async (
      prompt: string,
      sandboxId: string,
      onStateChange: (state: AgentStreamState) => void,
      chatHistory?: Array<{ role: string; content: string }>,
      projectId?: string,
      intent?: string,
      resumeReview?: {
        issues: string[];
        todos?: Array<{ id: string; content: string; status: string }>;
      }
    ): Promise<AgentStreamState> => {
      if (!sandboxId) {
        const errorState: AgentStreamState = {
          ...createInitialAgentStreamState(),
          status: 'error',
          statusLabel: 'No sandbox available',
          isRunning: false,
          error: 'No sandbox available. Please create one first.',
        };
        onStateChange(errorState);
        return errorState;
      }

      abortRef.current = new AbortController();
      sandboxIdRef.current = sandboxId;
      currentJobIdRef.current = null;
      // A brand-new job supersedes any persisted/resumable job for this sandbox.
      resumeAttemptedForRef.current = sandboxId;
      clearPersistedAgentJobId(sandboxId);

      const state = createInitialAgentStreamState();

      onStateChange({ ...state });

      try {
        // Step 1: enqueue the generation job. This returns immediately with a
        // jobId even if the backend restarts or the worker is busy.
        const enqueueResult = await agentStream(
          {
            prompt,
            sandboxId,
            chatHistory,
            projectId,
            intent,
            resumeReview,
          }
        );

        if (!enqueueResult.ok) {
          const planLimit = extractPlanLimitError(enqueueResult);
          if (planLimit) {
            useEntitlementsStore.getState().openUpgradeDialog(planLimit);
          }
          throw new Error(enqueueResult.error || `Failed to start generation: ${enqueueResult.status}`);
        }

        const { jobId } = enqueueResult.data;
        currentJobIdRef.current = jobId;
        // Persist so a page refresh mid-generation can re-attach (see resume()).
        persistAgentJobId(sandboxId, jobId);

        // Step 2: open an SSE subscription to the queued job and stream it to a
        // terminal state.
        return await streamJobToCompletion(jobId, state, onStateChange);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          state.isRunning = false;
          state.status = 'done';
          state.statusLabel = 'Cancelled';
          state.agentSteps.forEach((s) => {
            s.done = true;
          });
          onStateChange({ ...state });
          return state;
        }

        const message =
          error instanceof Error ? error.message : String(error);
        state.error = message;
        state.status = 'error';
        state.statusLabel = 'Error';
        state.isRunning = false;
        state.agentSteps.forEach((s) => {
          s.done = true;
        });
        onStateChange({ ...state });
        return state;
      }
    },
    [streamJobToCompletion]
  );

  const abort = useCallback(() => {
    const jobId = currentJobIdRef.current;
    if (jobId) {
      // Ask the backend to stop the BullMQ job / worker. Fire-and-forget: the
      // SSE abort below will finish the local stream regardless.
      cancelAgentJob(jobId).catch((err) => {
        console.warn('[useAgentStream] Failed to cancel agent job:', err);
      });
    }
    // The job is being abandoned — don't re-attach to it after a refresh.
    clearPersistedAgentJobId(sandboxIdRef.current);
    abortRef.current?.abort();
  }, []);

  // Re-attach to an in-flight job after a page refresh. Returns null when there
  // is nothing to resume (or a resume/send already handled this sandbox).
  const resume = useCallback(
    async (
      sandboxId: string,
      onStateChange: (state: AgentStreamState) => void
    ): Promise<AgentStreamState | null> => {
      if (!sandboxId) return null;
      if (resumeAttemptedForRef.current === sandboxId) return null;
      resumeAttemptedForRef.current = sandboxId;

      // Prefer the jobId persisted before the refresh; fall back to asking the
      // backend for the active job on this sandbox (covers private browsing and
      // backend-retry scenarios where the stream had already errored out).
      let jobId = readPersistedAgentJobId(sandboxId);
      if (!jobId) {
        try {
          const result = await getActiveAgentJob(sandboxId);
          if (result.ok && result.data.success && result.data.job?.id) {
            jobId = result.data.job.id;
          }
        } catch {
          jobId = null;
        }
      }

      // Nothing to resume, or send() started a new job while we were looking.
      if (!jobId || currentJobIdRef.current) return null;

      abortRef.current = new AbortController();
      sandboxIdRef.current = sandboxId;
      currentJobIdRef.current = jobId;

      const state = createInitialAgentStreamState('Resuming generation...');
      onStateChange({ ...state });

      // Re-attaching to a finished job is harmless: the backend replays the
      // terminal event (done/error) and closes, which the normal handlers treat
      // like any other stream end (including clearing the persisted jobId).
      try {
        return await streamJobToCompletion(jobId, state, onStateChange);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          state.isRunning = false;
          state.status = 'done';
          state.statusLabel = 'Cancelled';
          state.agentSteps.forEach((s) => {
            s.done = true;
          });
          onStateChange({ ...state });
          return state;
        }

        const message =
          error instanceof Error ? error.message : String(error);
        state.error = message;
        state.status = 'error';
        state.statusLabel = 'Error';
        state.isRunning = false;
        state.agentSteps.forEach((s) => {
          s.done = true;
        });
        onStateChange({ ...state });
        return state;
      }
    },
    [streamJobToCompletion]
  );

  const rollback = useCallback(async (): Promise<boolean> => {
    const sandboxId = sandboxIdRef.current;
    const snapshotId = lastSnapshotIdRef.current;
    if (!sandboxId || !snapshotId) return false;
    const result = await restoreSandboxSnapshot(sandboxId, snapshotId);
    return result.ok && result.data.success;
  }, []);

  return { send, abort, resume, rollback, lastSnapshotIdRef, currentJobIdRef };
}

async function readAgentStream(
  response: Response,
  state: AgentStreamState,
  onStateChange: (state: AgentStreamState) => void,
  onEvent: ((event: AgentStreamEvent) => void) | undefined,
  sandboxIdRef: React.RefObject<string | null>,
  lastSnapshotIdRef: React.MutableRefObject<string | null>,
): Promise<AgentStreamState> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let lastEventAt = Date.now();
  const IDLE_TIMEOUT_MS = 90_000;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Any bytes arriving reset the idle detector, including heartbeats.
    if (value) {
      lastEventAt = Date.now();
    }

    // Client-side safety timeout: if the worker stops emitting events,
    // surface a retryable error instead of waiting forever.
    if (Date.now() - lastEventAt > IDLE_TIMEOUT_MS) {
      await reader.cancel().catch(() => {
        // ignore
      });
      throw new Error('Generation stream stalled. Please retry or refresh.');
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      try {
        const event = JSON.parse(line.slice(6)) as AgentStreamEvent;
        lastEventAt = Date.now();
         
        console.log('[useAgentStream event]', event.type, event.type === 'token' ? (event.data.content?.length ?? 0) : '');
        onEvent?.(event);

              switch (event.type) {
                case 'status':
                  state.status = event.data.status;
                  state.statusLabel = event.data.message;
                  // When the workflow leaves the code-writing phases, clear the
                  // active file stream so reviewer/finalize tokens don't get
                  // appended to the last written file.
                  if (state.status !== 'executing' && state.status !== 'debugging') {
                    state.currentFile = null;
                    state.streamedText = '';
                  }
                  break;

                case 'token': {
                  const node = event.data.node ?? 'assistant';
                  // The backend tags code tokens (extracted from file-writing tool
                  // arguments) with kind='code'. Everything else is the agent's
                  // reasoning/narration ("thinking"). Fall back to the legacy
                  // currentFile gate when kind is missing.
                  const kind =
                    event.data.kind ?? (state.currentFile ? 'code' : 'thinking');

                  if (kind === 'code' && state.currentFile) {
                    state.streamedText += event.data.content;
                    state.currentFile.content += event.data.content;
                    // Code streams into the per-agent "Stream synthesis" step.
                    const codeStepId = `${node}:code`;
                    let codeStep = state.agentSteps.find((s) => s.id === codeStepId);
                    if (!codeStep) {
                      codeStep = { id: codeStepId, node, kind: 'code', text: '', done: false };
                      state.agentSteps.push(codeStep);
                    }
                    codeStep.done = false;
                    state.agentSteps.forEach((s) => {
                      if (s !== codeStep) s.done = true;
                    });
                    codeStep.text += event.data.content;
                  } else {
                    // Thinking/reasoning tokens accumulate into the agent's own
                    // step so the chat can show one streaming card per agent.
                    let step = state.agentSteps.find(
                      (s) => s.id === node && s.kind === 'thinking',
                    );
                    if (!step) {
                      step = { id: node, node, kind: 'thinking', text: '', done: false };
                      state.agentSteps.push(step);
                    }
                    step.done = false;
                    state.agentSteps.forEach((s) => {
                      if (s !== step) s.done = true;
                    });
                    step.text += event.data.content;
                  }
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[useAgentStream token]', event.data.content.length, event.data.content.slice(0, 40));
                  }
                  // Token events are intentionally NOT flushed synchronously.
                  // React batches them naturally, which avoids forcing a re-render
                  // of the whole workspace on every single character and keeps the
                  // browser responsive during long file streams.
                  onStateChange({ ...state });
                  continue;
                }

                case 'tool_start': {
                  // For file-writing tools, set the current file as soon as the model
                  // starts generating the tool call so the streaming header shows the
                  // correct filename while code tokens are still arriving.
                  const toolName = event.data.tool;
                  const args = event.data.args as Record<string, unknown> | undefined;
                  const path = typeof args?.path === 'string' ? args.path : undefined;
                  if (path && (toolName === 'write_file' || toolName === 'edit_file' || toolName === 'search_replace')) {
                    const ext = path.split('.').pop() || '';
                    const type =
                      ext === 'jsx' || ext === 'js' || ext === 'tsx' || ext === 'ts'
                        ? 'javascript'
                        : ext === 'css'
                          ? 'css'
                          : ext === 'json'
                            ? 'json'
                            : ext === 'html'
                              ? 'html'
                              : 'text';
                    const prevCurrentFile = state.currentFile;
                    const isSameFile = prevCurrentFile?.path === path;
                    state.currentFile = {
                      path,
                      content: isSameFile ? prevCurrentFile.content : '',
                      type,
                    };
                    if (!isSameFile) {
                      state.streamedText = '';
                    }
                    flushSync(() => {
                      onStateChange({ ...state });
                    });
                    continue;
                  }
                  break;
                }

                case 'tool_end':
                  // Could show tool result
                  state.toolProgress = null;
                  break;

                case 'tool_progress':
                  state.toolProgress = {
                    tool: event.data.tool,
                    message: event.data.message,
                    percent: event.data.percent,
                  };
                  break;

                case 'command_delta':
                  state.commandLog.push({
                    tool: event.data.tool,
                    stream: event.data.stream,
                    chunk: event.data.chunk,
                  });
                  // Keep log bounded so memory doesn't grow without limit
                  if (state.commandLog.length > 500) {
                    state.commandLog = state.commandLog.slice(-500);
                  }
                  break;

                case 'file_start': {
                  // The model has started generating a file-writing tool call.
                  // Surface the filename immediately so the streaming header is
                  // in sync with the code tokens that are already arriving.
                  const startPath = event.data.path;
                  const startExt = startPath.split('.').pop() || '';
                  const startType =
                    startExt === 'jsx' || startExt === 'js' || startExt === 'tsx' || startExt === 'ts'
                      ? 'javascript'
                      : startExt === 'css'
                        ? 'css'
                        : startExt === 'json'
                          ? 'json'
                          : startExt === 'html'
                            ? 'html'
                            : 'text';
                  const prevCurrentFile = state.currentFile;
                  const isSameFile = prevCurrentFile?.path === startPath;
                  // Only update currentFile here; the file list is populated by
                  // file_update once the tool has actually written the file. This
                  // avoids path-normalization mismatches between the raw model
                  // argument and the normalized path used by file_update.
                  state.currentFile = {
                    path: startPath,
                    content: isSameFile ? prevCurrentFile.content : '',
                    type: startType,
                  };
                  if (!isSameFile) {
                    state.streamedText = '';
                  }
                  flushSync(() => {
                    onStateChange({ ...state });
                  });
                  continue;
                }

                case 'file_update':
                  {
                    const { path, status } = event.data;
                    const ext = path.split('.').pop() || '';
                    const type =
                      ext === 'jsx' || ext === 'js' || ext === 'tsx' || ext === 'ts'
                        ? 'javascript'
                        : ext === 'css'
                          ? 'css'
                          : ext === 'json'
                            ? 'json'
                            : ext === 'html'
                              ? 'html'
                              : 'text';

                    if (status === 'deleted') {
                      state.files = state.files.filter((f) => f.path !== path);
                      if (state.currentFile?.path === path) {
                        state.currentFile = null;
                        state.streamedText = '';
                      }
                    } else {
                      // The backend now sends only metadata. Fetch the full content
                      // lazily so the file explorer and streaming header stay in sync
                      // without bloating the SSE payload.
                      const sandboxId = sandboxIdRef.current;
                      if (sandboxId) {
                        try {
                          const result = await getSandboxFile(sandboxId, path);
                          if (result.ok) {
                            const content = result.data.content;
                            const existing = state.files.find((f) => f.path === path);
                            if (existing) {
                              existing.content = content;
                              existing.completed = true;
                              existing.edited = status === 'modified';
                            } else {
                              state.files.push({
                                path,
                                content,
                                type,
                                completed: true,
                                edited: false,
                              });
                            }
                            state.currentFile = { path, content, type };
                            state.streamedText = content;
                          }
                        } catch (fetchErr) {
                          console.warn(`[useAgentStream] Failed to fetch ${path}:`, fetchErr);
                        }
                      }
                    }
                  }
                  flushSync(() => {
                    onStateChange({ ...state });
                  });
                  continue;

                case 'snapshot':
                  lastSnapshotIdRef.current = event.data.snapshotId;
                  continue;

                case 'todos_update':
                  state.todos = event.data.todos;
                  flushSync(() => {
                    onStateChange({ ...state });
                  });
                  continue;

                case 'review':
                  state.review = {
                    passed: event.data.passed,
                    issues: event.data.issues,
                    suggestions: event.data.suggestions,
                  };
                  break;

                case 'review_max_reached':
                  state.reviewMaxReached = true;
                  state.reviewMaxIssues = event.data.issues;
                  state.reviewMaxTodos = event.data.todos ?? [];
                  break;

                case 'preview':
                  state.previewUrl = event.data.url;
                  break;

                case 'done':
                  state.isRunning = false;
                  state.status = 'done';
                  state.statusLabel = 'Done';
                  state.finalResponse = event.data.finalResponse;
                  state.agentSteps.forEach((s) => {
                    s.done = true;
                  });
                  // Terminal state: drop the persisted jobId so a future
                  // refresh doesn't re-attach to a finished job.
                  clearPersistedAgentJobId(sandboxIdRef.current);
                  break;

                case 'suggestions':
                  state.suggestions = event.data.items;
                  break;

                case 'error':
                  state.error = event.data.message;
                  state.status = 'error';
                  state.statusLabel = 'Error';
                  state.isRunning = false;
                  state.agentSteps.forEach((s) => {
                    s.done = true;
                  });
                  // Terminal state: drop the persisted jobId so a future
                  // refresh doesn't re-attach to a finished job.
                  clearPersistedAgentJobId(sandboxIdRef.current);
                  break;

                case 'questionnaire':
                  state.questionnaire = { questions: event.data.questions };
                  break;

                case 'plan':
                  state.plan = {
                    title: event.data.title,
                    summary: event.data.summary,
                    plan: event.data.plan,
                  };
                  break;

                case 'exit_plan':
                  state.exitPlan = event.data.confirmed;
                  break;
              }

              onStateChange({ ...state });
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }

  state.isRunning = false;
  onStateChange({ ...state });
  return state;
}
