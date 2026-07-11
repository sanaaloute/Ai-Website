import { useCallback } from 'react';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import type { ChatMessage, ConversationContext } from '@/hooks/useWorkspaceChat';
import type { GenerationProgress, ApplyPipelineState, CodeApplicationState } from '@/hooks/useGenerationProgress';
import { getErrorMessage } from '@/lib/generation/pageUtils';
import { applyAICodeStream } from '@/lib/api/client';
import { useApplyPipeline } from './useApplyPipeline';
import { useCodeStreamer } from './useCodeStreamer';
import { getPendingPackages } from './useChatStreamParser';
import { assertCurrentSandboxId } from '@/lib/sandbox/sandboxClientSession';

export interface ApplyGeneratedCodeDeps {
  sandboxData: SandboxData | null;
  chatMessages: ChatMessage[];
  conversationContext: ConversationContext;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
  setConversationContext: React.Dispatch<React.SetStateAction<ConversationContext>>;
  applyPipelineStateRef: React.MutableRefObject<ApplyPipelineState>;
  transitionApplyPipelineState: (next: ApplyPipelineState, reason: string) => boolean;
  setCodeApplicationState: React.Dispatch<React.SetStateAction<CodeApplicationState>>;
  setGenerationProgress: React.Dispatch<React.SetStateAction<GenerationProgress>>;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  latestSandboxDataRef: React.RefObject<SandboxData | null>;
  latestPreviewErrorRef: React.RefObject<string | null>;
  setLoading: (val: boolean) => void;
  setHasSavedGeneratedProject: (val: boolean) => void;
  setPreviewHealthIssue: (issue: string | null) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<'preview' | 'generation'>>;
  waitForPreviewHealthy: (timeoutMs?: number) => Promise<boolean>;
  probePreviewHealth: (
    reason: 'restore' | 'apply' | 'reload',
    timeoutMs?: number
  ) => Promise<{
    reachable: boolean;
    active: boolean;
    diagnostics?: string;
    statusCode?: number;
  }>;
  fetchSandboxFiles: () => Promise<void>;
  ensureProjectNameForAction: (
    action:
      | { kind: 'save'; saveReason: 'manual' | 'auto-generation-success' }
      | { kind: 'github-open' }
      | { kind: 'vercel-deploy' }
  ) => boolean;
  persistProjectDurably: (
    saveReason: 'manual' | 'auto-generation-success',
    projectNameOverride?: string
  ) => Promise<boolean>;
  attachE2bSandbox: (targetSandboxId: string, options?: { forceReconnect?: boolean }) => Promise<void>;
  requestAutoRestorePreferredProject: (preferredProjectId?: string | null) => string | null;
  createSandbox: (options?: boolean | { fromHomeScreen?: boolean; skipInitialFileFetch?: boolean; preserveProjectContext?: boolean; preserveCloudSelectionId?: string; projectName?: string; skipSetup?: boolean }) => Promise<unknown>;
  submitPreviewErrorForFixRef: React.MutableRefObject<(rawError: string) => void>;
  submitPreviewHealthForFixRef: React.MutableRefObject<(issueText: string) => void>;
  log: (message: string, type?: 'info' | 'error' | 'command') => void;
  displayStructure: (structure: unknown) => void;
}

export function useApplyGeneratedCode(deps: ApplyGeneratedCodeDeps) {
  const {
    sandboxData,
    chatMessages,
    conversationContext,
    addChatMessage,
    setConversationContext,
    applyPipelineStateRef,
    transitionApplyPipelineState,
    setCodeApplicationState,
    setGenerationProgress,
    iframeRef,
    latestSandboxDataRef,
    latestPreviewErrorRef,
    setLoading,
    setHasSavedGeneratedProject,
    setPreviewHealthIssue,
    setActiveTab,
    waitForPreviewHealthy,
    probePreviewHealth,
    fetchSandboxFiles,
    ensureProjectNameForAction,
    persistProjectDurably,
    attachE2bSandbox,
    requestAutoRestorePreferredProject,
    createSandbox,
    submitPreviewErrorForFixRef,
    submitPreviewHealthForFixRef,
    log,
    displayStructure,
  } = deps;

  const {
    validateAndStartPipeline,
    handleApplySuccess,
    handleApplyError,
    cleanupPipeline,
  } = useApplyPipeline({
    applyPipelineStateRef,
    transitionApplyPipelineState,
    setCodeApplicationState,
    setGenerationProgress,
    sandboxData,
    chatMessages,
    conversationContext,
    iframeRef,
    latestSandboxDataRef,
    latestPreviewErrorRef,
    setHasSavedGeneratedProject,
    setPreviewHealthIssue,
    setActiveTab,
    addChatMessage,
    setConversationContext,
    log,
    displayStructure,
    fetchSandboxFiles,
    waitForPreviewHealthy,
    probePreviewHealth,
    ensureProjectNameForAction,
    persistProjectDurably,
    attachE2bSandbox,
    submitPreviewErrorForFixRef,
    submitPreviewHealthForFixRef,
  });

  const { streamCode } = useCodeStreamer({
    transitionApplyPipelineState,
    setCodeApplicationState,
    addChatMessage,
  });

  const applyGeneratedCode = useCallback(
    async (code: string, isEdit: boolean = false, overrideSandboxData?: SandboxData) => {
      setLoading(true);
      log('Applying AI-generated code...');

      try {
        const { applyDeadlineAt } = validateAndStartPipeline();

        const pendingPackages = getPendingPackages().filter((pkg) => pkg && typeof pkg === 'string');

        const effectiveSandboxData = overrideSandboxData || sandboxData;
        const effectiveSandboxId = effectiveSandboxData?.sandboxId;

        // Guard: reject stale sandbox IDs before applying code
        if (effectiveSandboxId && !assertCurrentSandboxId(effectiveSandboxId, 'applyGeneratedCode')) {
          throw new Error(
            `Sandbox ${effectiveSandboxId} is no longer active. A newer workspace is available. Please retry.`
          );
        }

        if (!effectiveSandboxId) {
          throw new Error('No sandbox available to apply code.');
        }

        const response = await applyAICodeStream({
          response: code,
          is_edit: isEdit,
          packages: pendingPackages,
          sandboxId: effectiveSandboxId,
        });

        if (!response.ok) {
          throw new Error(`Failed to apply code: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body available for streaming.');
        }

        const { finalData, lastProgressAt } = await streamCode(reader, applyDeadlineAt);

        if (finalData && (finalData as Record<string, unknown>).type === 'complete') {
          await handleApplySuccess(finalData, code, isEdit, effectiveSandboxData);
        } else {
          const idleSeconds = Math.round((Date.now() - lastProgressAt) / 1000);
          throw new Error(
            idleSeconds >= 90
              ? 'Code apply stream stalled during analyze/apply. Try "Refresh sandbox" and re-apply.'
              : 'Code apply stream ended before completion acknowledgement.'
          );
        }
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        handleApplyError(errorMessage);
        log(`Failed to apply code: ${errorMessage}`, 'error');
        addChatMessage(`Apply failed: ${errorMessage}`, 'system');
        if (/sandbox/i.test(errorMessage)) {
          requestAutoRestorePreferredProject();
          void createSandbox({
            fromHomeScreen: true,
            preserveProjectContext: true
          });
        }
      } finally {
        setLoading(false);
        cleanupPipeline();
      }
    },
    [
      sandboxData,
      validateAndStartPipeline,
      streamCode,
      handleApplySuccess,
      handleApplyError,
      cleanupPipeline,
      setLoading,
      log,
      addChatMessage,
      requestAutoRestorePreferredProject,
      createSandbox,
    ]
  );

  return applyGeneratedCode;
}
