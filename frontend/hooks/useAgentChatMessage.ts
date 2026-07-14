import { useCallback, useRef } from 'react';
import { useAgentStream } from './useAgentStream';
import { restoreLocalProject } from '@/lib/api/client';
import type { SandboxData } from './useWorkspaceSandbox';
import type { ChatMessage, ConversationContext } from './useWorkspaceChat';
import type { GenerationProgress } from './useGenerationProgress';
import {
  getErrorMessage,
  getVisibleUserMessage,
  classifyGatewayError,
} from '@/lib/generation/pageUtils';

export type SendChatMessageInput =
  | string
  | {
      visible: string;
      llm: string;
      intent?: string;
      resumeReview?: {
        issues: string[];
        todos?: Array<{ id: string; content: string; status: string }>;
      };
    };

/**
 * Human-readable card titles for each agent (graph node) streaming step.
 * Code-writing streams (kind='code') are always surfaced as "Stream synthesis".
 */
function getAgentStepLabel(step: { node: string; kind: 'thinking' | 'code' }): string {
  if (step.kind === 'code') return 'Stream synthesis';
  const labels: Record<string, string> = {
    coordinator: 'Analyzing your request',
    analyzer: 'Analyzing your request',
    designer: 'Designing website',
    component_selector: 'Selecting components',
    template_selector: 'Selecting template',
    database_initializer: 'Preparing database',
    planner: 'Planning',
    pre_flight_validator: 'Validating plan',
    executor: 'Writing code',
    reviewer: 'Reviewing code',
    debugger: 'Fixing issues',
    answer_generator: 'Answering',
  };
  return (
    labels[step.node] ??
    step.node
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  );
}

export interface AgentChatMessageDeps {
  aiEnabled: boolean;
  ensureAiWebsiteApiKey: () => Promise<boolean>;
  aiWebsiteKeySite: string;
  sandboxData: SandboxData | null;
  setSandboxData: (data: SandboxData | null) => void;
  sandboxDataRef: React.RefObject<SandboxData | null>;
  createSandbox: (fromHomeScreen?: boolean) => Promise<unknown>;
  aiChatInput: string;
  chatMessages: ChatMessage[];
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setAiChatInput: (val: string) => void;
  conversationContext: ConversationContext;
  setConversationContext: React.Dispatch<React.SetStateAction<ConversationContext>>;
  promptInput: string;
  setPromptInput: (val: string) => void;
  setGenerationTaskStartedAtMs: React.Dispatch<React.SetStateAction<number | null>>;
  setGenerationProgress: React.Dispatch<React.SetStateAction<GenerationProgress>>;
  structureContent: string;
  setActiveTab: React.Dispatch<React.SetStateAction<'preview' | 'generation'>>;
  setQuotaErrorText: (text: string) => void;
  setShowQuotaDialog: (show: boolean) => void;
  setApiKeyError: (error: string) => void;
  setShowApiKeyDialog: (show: boolean) => void;
  forceNextMessageAsEditRef: React.MutableRefObject<boolean>;
  autoPreviewRepairInFlightRef?: React.MutableRefObject<boolean>;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  setIsLandingBoot?: (value: boolean) => void;
  projectId?: string;
}

export function useAgentChatMessage(deps: AgentChatMessageDeps) {
  const {
    aiEnabled,
    ensureAiWebsiteApiKey,
    aiWebsiteKeySite,
    setSandboxData,
    sandboxDataRef,
    createSandbox,
    aiChatInput,
    chatMessages,
    addChatMessage,
    setAiChatInput,
    setGenerationTaskStartedAtMs,
    setGenerationProgress,
    setActiveTab,
    setQuotaErrorText,
    setShowQuotaDialog,
    setApiKeyError,
    setShowApiKeyDialog,
    forceNextMessageAsEditRef,
    autoPreviewRepairInFlightRef,
    iframeRef,
    setIsLandingBoot,
  } = deps;

  const { send, abort } = useAgentStream({});

  // Guard to prevent duplicate final chat messages
  const finalMessageAddedRef = useRef(false);

  const maybeSetIframeSrc = useCallback(() => {
    const url = sandboxDataRef.current?.url;
    if (url && iframeRef?.current && !iframeRef.current.src) {
      iframeRef.current.src = url;
    }
  }, [iframeRef, sandboxDataRef]);

  const sendChatMessage = useCallback(
    async (input?: SendChatMessageInput) => {
      const visibleMessage = typeof input === 'string' ? input : input?.visible;
      const llmMessage = typeof input === 'string' ? input : input?.llm;
      const intent = typeof input === 'string' ? undefined : input?.intent;
      const resumeReview = typeof input === 'string' ? undefined : input?.resumeReview;
      const message = (visibleMessage ?? aiChatInput).trim();
      const actualMessage = (llmMessage ?? message).trim();
      if (!message) return;

      if (!aiEnabled) {
        addChatMessage('AI is disabled. Please enable it first.', 'error');
        return;
      }
      const hasKey = await ensureAiWebsiteApiKey();
      if (!hasKey) {
        addChatMessage(
          `AI-Website API key required. Get one at ${aiWebsiteKeySite} and add it to continue.`,
          'error'
        );
        return;
      }

      addChatMessage(getVisibleUserMessage(message), 'user');
      setAiChatInput('');

      // Start sandbox creation in parallel if needed
      const hasSandbox = Boolean(sandboxDataRef.current?.sandboxId);
      let createdSandboxId: string | null = null;
      if (!hasSandbox) {
        addChatMessage('Creating sandbox while I plan your app...', 'system');
        try {
          const newSandbox = await createSandbox(true);
          if (newSandbox && typeof newSandbox === 'object' && 'sandboxId' in newSandbox) {
            createdSandboxId = (newSandbox as Record<string, unknown>).sandboxId as string;
          }
        } catch (error: unknown) {
          addChatMessage(`Failed to create sandbox: ${getErrorMessage(error)}`, 'system');
          throw error;
        }
      }

      // Restore project files from local SQLite if we have a projectId
      if (deps.projectId && createdSandboxId) {
        try {
          const result = await restoreLocalProject(deps.projectId, createdSandboxId);
          if (result.ok && result.data.success && result.data.restoredCount && result.data.restoredCount > 0) {
            addChatMessage(
              `Restored ${result.data.restoredCount} files from local project storage.`,
              'system'
            );
          }
        } catch (restoreErr) {
          const msg = restoreErr instanceof Error ? restoreErr.message : 'Local restore failed';
          console.warn('[AgentChat] Local restore failed:', restoreErr);
          addChatMessage(`Local project restore failed: ${msg}`, 'system');
        }
      }

      const forcedEdit = forceNextMessageAsEditRef.current;
      if (forcedEdit) {
        forceNextMessageAsEditRef.current = false;
      }

      try {
        finalMessageAddedRef.current = false;
        setGenerationTaskStartedAtMs(Date.now());
        setActiveTab('generation');
        setIsLandingBoot?.(false);
        setGenerationProgress((prev) => ({
          ...prev,
          isGenerating: true,
          status: 'Analyzing your request...',
          components: [],
          currentComponent: 0,
          streamedCode: '',
          isStreaming: false,
          isThinking: false,
          thinkingText: undefined,
          thinkingDuration: undefined,
          currentFile: undefined,
          lastProcessedPosition: 0,
          isEdit: forcedEdit || false,
          estimatedPercent: 3,
          todoList: [
            { label: 'Analyzing', done: false },
            { label: 'Planning', done: false },
            { label: 'Writing code', done: false },
            { label: 'Reviewing', done: false },
            { label: 'Building preview', done: false },
          ],
          questionnaire: null,
          plan: null,
          exitPlan: false,
          agentSteps: [],
        }));

        const chatHistory = chatMessages
          .filter((m) => m.type === 'user' || m.type === 'ai')
          .map((m) => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content,
          }));

        const finalState = await send(
          actualMessage,
          sandboxDataRef.current?.sandboxId || '',
          (state) => {
          // Map agent state to generation progress
          const todoMap: Record<string, string> = {
            analyzing: 'Analyzing',
            planning: 'Planning',
            executing: 'Writing code',
            reviewing: 'Reviewing',
            debugging: 'Fixing issues',
            finalizing: 'Building preview',
            done: 'Building preview',
            error: 'Error',
          };

          const activeTodo = todoMap[state.status] || 'Analyzing';

          setGenerationProgress((prev) => {
            // Use streamed todos from the agent if available, otherwise fall back to stage-based labels.
            // When the workflow is complete, force every todo to done so the UI never shows stale progress.
            const isDone = state.status === 'done';
            const todoList = state.todos && state.todos.length > 0
              ? state.todos.map((t) => ({
                  label: t.content,
                  done: isDone || t.status === 'completed',
                  status: isDone ? 'completed' : t.status,
                }))
              : (() => {
                  const todoLabels = ['Analyzing', 'Planning', 'Writing code', 'Reviewing', 'Building preview'];
                  const activeIndex = todoLabels.indexOf(activeTodo);
                  return state.status === 'error'
                    ? prev.todoList
                    : todoLabels.map((label, i) => ({
                        label,
                        done: i < activeIndex || (state.status === 'done' && i < todoLabels.length),
                      }));
                })();

            // Calculate estimated percent based on real progress when possible.
            // If the backend streamed a todo list, derive the percent from the
            // ratio of completed / in-progress todos. Otherwise fall back to the
            // coarse stage mapping.
            const stagePercent: Record<string, number> = {
              analyzing: 10,
              planning: 20,
              installing: 30,
              executing: 50,
              reviewing: 75,
              debugging: 80,
              finalizing: 90,
              done: 100,
              error: 0,
            };

            const computeEstimatedPercent = (): number => {
              if (state.status === 'done') return 100;
              if (state.status === 'error') return 0;

              if (state.todos && state.todos.length > 0) {
                const completed = state.todos.filter((t) => t.status === 'completed').length;
                const inProgress = state.todos.filter((t) => t.status === 'in_progress').length;
                const progress = completed + inProgress * 0.5;
                return Math.min(99, Math.round((progress / state.todos.length) * 100));
              }

              return stagePercent[state.status] ?? prev.estimatedPercent;
            };

            // Merge agent-streamed files with existing sandbox files.
            // Agent files take precedence (updates override existing content).
            const agentFileMap = new Map(state.files.map((f) => [f.path, f]));
            const mergedFiles = prev.files.map((f) => {
              const agentFile = agentFileMap.get(f.path);
              if (agentFile) {
                agentFileMap.delete(f.path); // Mark as handled
                return {
                  path: f.path,
                  content: agentFile.content,
                  type: agentFile.type as 'javascript' | 'css' | 'json' | 'html' | 'text',
                  completed: true,
                  edited: true,
                };
              }
              return f;
            });
            // Append any new files the agent created that weren't in the existing set
            for (const [, agentFile] of agentFileMap) {
              mergedFiles.push({
                path: agentFile.path,
                content: agentFile.content,
                type: agentFile.type as 'javascript' | 'css' | 'json' | 'html' | 'text',
                completed: true,
                edited: agentFile.edited || false,
              });
            }
            if (mergedFiles.length !== prev.files.length) {
              // Files changed — no-op, state update handles UI
            }

            // Build currentFile for streaming display
            const currentFile = state.currentFile
              ? {
                  path: state.currentFile.path,
                  content: state.currentFile.content,
                  type: state.currentFile.type as 'javascript' | 'css' | 'json' | 'html' | 'text',
                }
              : prev.currentFile;

            return {
              ...prev,
              status: state.statusLabel,
              isGenerating: state.isRunning,
              // "Streaming" now means we are actively writing a file. This keeps
              // planning/analyzer output out of the code streaming panel and binds
              // the stream to a specific file.
              isStreaming: state.isRunning && Boolean(state.currentFile),
              streamedCode: state.currentFile?.content || state.streamedText,
              files: mergedFiles,
              currentFile,
              estimatedPercent: computeEstimatedPercent(),
              todoList,
              questionnaire: state.questionnaire,
              plan: state.plan,
              exitPlan: state.exitPlan,
              agentSteps: state.agentSteps
                .filter((step) => step.kind !== 'code')
                .map((step) => ({
                  ...step,
                  label: getAgentStepLabel(step),
                })),
              reviewMaxReached: state.reviewMaxReached || prev.reviewMaxReached,
              reviewMaxIssues: state.reviewMaxIssues?.length ? state.reviewMaxIssues : prev.reviewMaxIssues,
              reviewMaxTodos: state.reviewMaxTodos?.length ? state.reviewMaxTodos : prev.reviewMaxTodos,
            };
          });

          // Add AI response text when done (guard against duplicates from multiple state updates)
          if (!state.isRunning && state.status === 'done' && !finalMessageAddedRef.current) {
            finalMessageAddedRef.current = true;
            // Prefer the concise finalResponse from finalize over the executor's long streamedText
            const text = (state.finalResponse || state.streamedText).trim();
            if (text) {
              addChatMessage(text, 'ai', {
                suggestions: state.suggestions && state.suggestions.length > 0 ? state.suggestions : undefined,
              });
            }
          }

          // Update sandboxData with preview URL when available
          if (state.previewUrl && sandboxDataRef.current && sandboxDataRef.current.url !== state.previewUrl) {
            const updated = { ...sandboxDataRef.current, url: state.previewUrl } as SandboxData;
            (sandboxDataRef as React.MutableRefObject<SandboxData | null>).current = updated;
            setSandboxData(updated);
          }

          // Switch to preview when preview URL is available
          // Don't auto-switch if review max reached — user needs to decide first
          if (state.previewUrl && state.status === 'done' && !state.reviewMaxReached) {
            setActiveTab('preview');
          }
        },
          chatHistory,
          deps.projectId,
          intent,
          resumeReview
        );

        // Reveal preview only after agent finishes generating
        // Skip preview if review max was reached — wait for user decision
        if ((finalState.status === 'done' || finalState.status === 'error') && !finalState.reviewMaxReached) {
          maybeSetIframeSrc();
        }

        // Add error chat message if agent finished with error
        if (finalState.status === 'error') {
          const errorText = finalState.error || 'An error occurred during code generation.';
          addChatMessage(`Error: ${errorText}`, 'error');
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('[agent-chat] Error:', error);

        const classification = classifyGatewayError(undefined, undefined, errMsg);
        if (classification.showQuotaDialog) {
          setQuotaErrorText(classification.userMessage);
          setShowQuotaDialog(true);
        }
        if (classification.showApiKeyDialog) {
          setApiKeyError(classification.userMessage);
          setShowApiKeyDialog(true);
        }

        addChatMessage(`Error: ${classification.userMessage || errMsg}`, 'error');
        setGenerationProgress({
          isGenerating: false,
          status: '',
          components: [],
          currentComponent: 0,
          streamedCode: '',
          isStreaming: false,
          isThinking: false,
          thinkingText: undefined,
          thinkingDuration: undefined,
          files: [],
          currentFile: undefined,
          lastProcessedPosition: 0,
          estimatedPercent: 0,
          todoList: [],
          questionnaire: null,
          plan: null,
          exitPlan: false,
        });
      } finally {
        // Clear auto-repair in-flight flag immediately when stream ends
        if (autoPreviewRepairInFlightRef) {
          autoPreviewRepairInFlightRef.current = false;
        }
      }
    },
    [
      deps.projectId,
      aiEnabled,
      ensureAiWebsiteApiKey,
      aiWebsiteKeySite,
      setSandboxData,
      sandboxDataRef,
      createSandbox,
      aiChatInput,
      chatMessages,
      addChatMessage,
      setAiChatInput,
      setGenerationTaskStartedAtMs,
      setGenerationProgress,
      setActiveTab,
      setQuotaErrorText,
      setShowQuotaDialog,
      setApiKeyError,
      setShowApiKeyDialog,
      forceNextMessageAsEditRef,
      autoPreviewRepairInFlightRef,
      maybeSetIframeSrc,
      setIsLandingBoot,
      send,
    ]
  );

  const abortChatMessage = useCallback(() => {
    abort();
  }, [abort]);

  return { sendChatMessage, abortChatMessage };
}
