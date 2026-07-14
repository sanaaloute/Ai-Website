import { useCallback, useRef } from 'react';
import { appConfig } from '@/config/app.config';
import type { SavedGeneratedProjectV1 } from '@/lib/generation/types';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import type { ChatMessage, ConversationContext } from '@/hooks/useWorkspaceChat';
import type { GenerationProgress, ApplyPipelineState, CodeApplicationState, GenerationFile } from '@/hooks/useGenerationProgress';
import { SAVED_GENERATED_PROJECT_KEY } from '@/lib/generation/constants';

export interface ApplyPipelineDeps {
  applyPipelineStateRef: React.MutableRefObject<ApplyPipelineState>;
  transitionApplyPipelineState: (next: ApplyPipelineState, reason: string) => boolean;
  setCodeApplicationState: React.Dispatch<React.SetStateAction<CodeApplicationState>>;
  setGenerationProgress: React.Dispatch<React.SetStateAction<GenerationProgress>>;
  sandboxData: SandboxData | null;
  chatMessages: ChatMessage[];
  conversationContext: ConversationContext;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  latestSandboxDataRef: React.RefObject<SandboxData | null>;
  latestPreviewErrorRef: React.RefObject<string | null>;
  setHasSavedGeneratedProject: (val: boolean) => void;
  setPreviewHealthIssue: (issue: string | null) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<'preview' | 'generation'>>;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
  setConversationContext: React.Dispatch<React.SetStateAction<ConversationContext>>;
  log: (message: string, type?: 'info' | 'error' | 'command') => void;
  displayStructure: (structure: unknown) => void;
  fetchSandboxFiles: () => Promise<void>;
  waitForPreviewHealthy: (timeoutMs?: number) => Promise<boolean>;
  probePreviewHealth: (reason: 'restore' | 'apply' | 'reload', timeoutMs?: number) => Promise<{ reachable: boolean; active: boolean; diagnostics?: string; statusCode?: number }>;
  ensureProjectNameForAction: (action: { kind: 'save'; saveReason: 'manual' | 'auto-generation-success' } | { kind: 'github-open' } | { kind: 'vercel-deploy' }) => boolean;
  persistProjectDurably: (saveReason: 'manual' | 'auto-generation-success', projectNameOverride?: string) => Promise<boolean>;
  attachE2bSandbox: (targetSandboxId: string, options?: { forceReconnect?: boolean }) => Promise<void>;
  submitPreviewErrorForFixRef: React.MutableRefObject<(rawError: string) => void>;
  submitPreviewHealthForFixRef: React.MutableRefObject<(issueText: string) => void>;
}

export function useApplyPipeline(deps: ApplyPipelineDeps) {
  const {
    applyPipelineStateRef, transitionApplyPipelineState, setCodeApplicationState, setGenerationProgress,
    chatMessages, conversationContext, iframeRef, latestSandboxDataRef, latestPreviewErrorRef,
    setHasSavedGeneratedProject, setPreviewHealthIssue, setActiveTab,
    addChatMessage, setConversationContext, log, displayStructure,
    fetchSandboxFiles, waitForPreviewHealthy, probePreviewHealth,
    ensureProjectNameForAction, persistProjectDurably, attachE2bSandbox, submitPreviewErrorForFixRef,
    submitPreviewHealthForFixRef,
  } = deps;

  // Incremented on each apply start; used to cancel stale timers/refresh sequences.
  const applyGenerationRef = useRef(0);

  const validateAndStartPipeline = useCallback(() => {
    const currentApplyState = applyPipelineStateRef.current;
    if (currentApplyState === 'connecting' || currentApplyState === 'streaming' || currentApplyState === 'finalizing') {
      throw new Error(`Apply pipeline is already in progress (${currentApplyState}).`);
    }
    if (currentApplyState === 'succeeded' || currentApplyState === 'failed') {
      transitionApplyPipelineState('idle', 'reset terminal state before new apply');
    }
    if (!transitionApplyPipelineState('connecting', 'begin applyGeneratedCode')) {
      throw new Error('Apply state machine rejected startup transition.');
    }
    setCodeApplicationState({ stage: 'analyzing', message: 'Starting apply pipeline...' });
    setGenerationProgress(prev => ({
      ...prev,
      status: 'Analyzing code...',
      todoList: prev.todoList.map(t =>
        t.label === 'Analyzing code' ? { ...t, done: false }
        : t.label === 'Applying changes' ? { ...t, done: false }
        : t
      ),
    }));
    return { applyDeadlineAt: undefined };
  }, [applyPipelineStateRef, transitionApplyPipelineState, setCodeApplicationState, setGenerationProgress]);

  const handleApplySuccess = useCallback(async (
    finalData: unknown, code: string, isEdit: boolean, effectiveSandboxData: SandboxData | null | undefined
  ) => {
    if (!transitionApplyPipelineState('finalizing', 'received completion event')) {
      throw new Error('Apply state machine rejected finalize transition.');
    }
    const typedFinalData = finalData as {
      completionAck?: { status?: unknown; token?: unknown; streamVersion?: unknown };
      results?: unknown; explanation?: unknown; structure?: unknown; analysis?: unknown;
      message?: unknown; autoCompleted?: unknown; autoCompletedComponents?: unknown;
      warning?: unknown; missingImports?: unknown; debug?: unknown; error?: unknown;
    };
    const completionAck = typedFinalData?.completionAck;
    const ackStatus = completionAck?.status;
    const hasValidCompletionAck = !!completionAck && typeof completionAck.token === 'string' && completionAck.token.length >= 8 && completionAck.streamVersion === 1 && (ackStatus === 'applied' || ackStatus === 'noop');
    if (!hasValidCompletionAck) {
      throw new Error('Apply stream ended without a valid completion acknowledgement.');
    }
    const typedResults = (typedFinalData.results || {}) as {
      packagesInstalled?: string[]; packagesFailed?: string[]; filesCreated?: string[];
      filesUpdated?: string[]; commandsExecuted?: string[]; errors?: string[];
    };
    const data = {
      success: true, results: typedResults, explanation: typedFinalData.explanation,
      structure: typedFinalData.structure, analysis: typedFinalData.analysis, message: typedFinalData.message,
      autoCompleted: typedFinalData.autoCompleted, autoCompletedComponents: typedFinalData.autoCompletedComponents,
      warning: typedFinalData.warning, missingImports: typedFinalData.missingImports, debug: typedFinalData.debug
    };
    const { results } = data;
    const packagesInstalled = results.packagesInstalled ?? [];
    const filesCreated = results.filesCreated ?? [];
    const packagesFailed = results.packagesFailed ?? [];
    const filesUpdated = results.filesUpdated ?? [];
    const commandsExecuted = results.commandsExecuted ?? [];
    const resultErrors = results.errors ?? [];
    if (packagesInstalled.length > 0) {
      log(`Packages installed: ${packagesInstalled.join(', ')}`);
    }
    if (filesCreated.length > 0) {
      log('Files created:');
      filesCreated.forEach((file: string) => log(`  ${file}`, 'command'));
    }
    if (filesUpdated.length > 0) {
      log('Files updated:');
      filesUpdated.forEach((file: string) => log(`  ${file}`, 'command'));
    }
    setConversationContext(prev => ({
      ...prev,
      appliedCode: [...prev.appliedCode, { files: [...filesCreated, ...filesUpdated], timestamp: new Date() }]
    }));
    if (commandsExecuted.length > 0) {
      log('Commands executed:');
      commandsExecuted.forEach((cmd: string) => log(`  $ ${cmd}`, 'command'));
    }
    if (resultErrors.length > 0) {
      resultErrors.forEach((err: string) => log(err, 'error'));
    }
    if (data.analysis) {
      const analysis = data.analysis as {
        summary?: string; issues?: Array<{ severity?: string; file?: string; message?: string; suggestion?: string }>; hasBlockingIssues?: boolean;
      };
      // Analyzer details are kept internal; only show a generic status if blocking issues remain
      if (analysis.hasBlockingIssues) {
        addChatMessage('Strengthening the code...', 'system');
      }
    }
    if (data.structure) displayStructure(data.structure);
    if (typeof data.explanation === 'string' && data.explanation) log(data.explanation);
    const autoCompletedComponents = Array.isArray(data.autoCompletedComponents) ? (data.autoCompletedComponents as string[]) : [];
    const missingImports = Array.isArray(data.missingImports) ? (data.missingImports as string[]) : [];
    if (data.autoCompleted === true) {
      log('Auto-generating missing components...', 'command');
      if (autoCompletedComponents.length > 0) {
        setTimeout(() => {
          log('Auto-generated missing components:', 'info');
          autoCompletedComponents.forEach((comp: string) => log(`  ${comp}`, 'command'));
        }, 1000);
      }
    } else if (typeof data.warning === 'string' && data.warning) {
      log(data.warning, 'error');
      if (missingImports.length > 0) {
        addChatMessage(`Ask me to "create the missing components: ${missingImports.join(', ')}" to fix these import errors.`, 'system');
      }
    }
    log('Code applied successfully!');
    try {
      if (typeof window !== 'undefined' && code && code.length < 900_000) {
        const appliedFiles = [...(results.filesCreated || []), ...(results.filesUpdated || [])];
        const payload: SavedGeneratedProjectV1 = {
          version: 1, generatedCode: code, isEdit: Boolean(isEdit), appliedFiles,
          savedAt: Date.now(), sandboxId: effectiveSandboxData?.sandboxId,
          currentProject: conversationContext.currentProject || undefined,
          databaseConnection: conversationContext.databaseConnection ?? null,
        };
        window.localStorage.setItem(SAVED_GENERATED_PROJECT_KEY, JSON.stringify(payload));
        setHasSavedGeneratedProject(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'localStorage error';
      console.warn('[saved-project] Failed to persist to localStorage:', e);
      addChatMessage(`Warning: could not save project locally (${msg}).`, 'system');
    }
    // Build file entries from applied results so the code panel and preview
    // know content exists even after generationProgress.files was reset.
    const appliedFileEntries: GenerationFile[] = [
      ...filesCreated.map((path: string) => {
        const ext = path.split('.').pop()?.toLowerCase() || '';
        const type: GenerationFile['type'] =
          ext === 'css' ? 'css' : ext === 'json' ? 'json' : ext === 'html' ? 'html' : 'javascript';
        return { path, content: '', type, completed: true, edited: false };
      }),
      ...filesUpdated.map((path: string) => {
        const ext = path.split('.').pop()?.toLowerCase() || '';
        const type: GenerationFile['type'] =
          ext === 'css' ? 'css' : ext === 'json' ? 'json' : ext === 'html' ? 'html' : 'javascript';
        return { path, content: '', type, completed: true, edited: true };
      }),
    ];

    setGenerationProgress(prev => {
      // Merge new files with existing ones so the file tree stays complete
      const mergedFiles = appliedFileEntries.length > 0
        ? [
            ...prev.files.filter(f => !appliedFileEntries.some(af => af.path === f.path)),
            ...appliedFileEntries,
          ]
        : prev.files;

      return {
        ...prev,
        files: mergedFiles,
        todoList: prev.todoList.map(t =>
          t.label === 'Analyzing code' || t.label === 'Applying changes'
            ? { ...t, done: true }
            : t
        ),
        estimatedPercent: 100,
      };
    });
    if (filesCreated.length > 0) {
      setConversationContext(prev => ({
        ...prev,
        appliedCode: [...prev.appliedCode, { files: filesCreated, timestamp: new Date() }]
      }));
      if (isEdit) {
        addChatMessage(`Edit applied successfully!`, 'system');
      } else {
        const recentMessages = chatMessages.slice(-5);
        const isPartOfGeneration = recentMessages.some(m => m.content.includes('AI recreation generated') || m.content.includes('Code generated'));
        if (isPartOfGeneration) {
          addChatMessage(`Applied ${filesCreated.length} files successfully!`, 'system');
        } else {
          addChatMessage(`Applied ${filesCreated.length} files successfully!`, 'system', { appliedFiles: filesCreated });
        }
      }
      if (packagesFailed.length > 0) {
        addChatMessage(`⚠️ Some packages failed to install. Check the error banner above for details.`, 'system');
      }
      await fetchSandboxFiles();
      void (async () => {
        const healthyPreview = await waitForPreviewHealthy(18000);
        if (!healthyPreview) {
          const fallbackProbe = await probePreviewHealth('apply', 4500);
          if (fallbackProbe.reachable) return;
          addChatMessage('Auto-save postponed: preview did not confirm a healthy render yet. Fix errors, then click Save Project.', 'system');
          return;
        }
        if (ensureProjectNameForAction({ kind: 'save', saveReason: 'auto-generation-success' })) {
          void persistProjectDurably('auto-generation-success');
        }
      })();
      const currentGeneration = ++applyGenerationRef.current;
      const refreshDelay = appConfig.codeApplication.defaultRefreshDelay;
      const postApplyHealthCheckDelay = refreshDelay + 2500;

      // Single consolidated iframe refresh sequence.
      window.setTimeout(() => {
        if (applyGenerationRef.current !== currentGeneration) return;
        const currentSandboxData = effectiveSandboxData;
        if (iframeRef.current && currentSandboxData?.url) {
          iframeRef.current.src = `${currentSandboxData.url}?t=${Date.now()}&applied=true`;
        }
      }, refreshDelay);

      // Post-apply health check with generation-guard cancellation.
      window.setTimeout(() => {
        void (async () => {
          if (applyGenerationRef.current !== currentGeneration) return;
          const healthyPreview = await waitForPreviewHealthy(22000);
          if (healthyPreview) return;
          const fallbackProbe = await probePreviewHealth('apply', 5000);
          if (fallbackProbe.reachable) return;
          if (applyGenerationRef.current !== currentGeneration) return;
          const recoverSandboxId = latestSandboxDataRef.current?.sandboxId;
          if (recoverSandboxId) {
            await attachE2bSandbox(recoverSandboxId, { forceReconnect: true });
            if (applyGenerationRef.current !== currentGeneration) return;
            if (iframeRef.current && latestSandboxDataRef.current?.url) {
              iframeRef.current.src = `${latestSandboxDataRef.current.url}?t=${Date.now()}&post_apply_recover=1`;
            }
            const recovered = await waitForPreviewHealthy(12000);
            if (recovered) return;
            const recoverProbe = await probePreviewHealth('apply', 5000);
            if (recoverProbe.reachable) return;
          }
          if (applyGenerationRef.current !== currentGeneration) return;
          setActiveTab('preview');
          const currentPreviewError = latestPreviewErrorRef.current?.trim() || '';
          if (currentPreviewError) {
            addChatMessage('Strengthening the code...', 'system');
            await submitPreviewErrorForFixRef.current(currentPreviewError);
            return;
          }
          const healthIssue = `Preview did not report a healthy render after apply. ${fallbackProbe.diagnostics ? `Probe: ${fallbackProbe.diagnostics}. ` : ''}No explicit Next.js error text was captured yet.`;
          setPreviewHealthIssue(healthIssue);
          addChatMessage(`Preview did not report a healthy render after apply. ${fallbackProbe.diagnostics ? `(${fallbackProbe.diagnostics}) ` : ''}Open View and use "Fix with AI" if an error card is shown.`, 'system');
          await submitPreviewHealthForFixRef.current(healthIssue);
        })();
      }, postApplyHealthCheckDelay);
    }
    // Iframe refresh is now handled by the single consolidated sequence above.
    transitionApplyPipelineState('succeeded', 'final data processed');
    setCodeApplicationState({ stage: 'complete' });
    setTimeout(() => { setCodeApplicationState({ stage: null }); }, 3000);
  }, [
    transitionApplyPipelineState, setCodeApplicationState, setGenerationProgress, chatMessages, conversationContext,
    iframeRef, latestSandboxDataRef, latestPreviewErrorRef, setHasSavedGeneratedProject, setPreviewHealthIssue,
    setActiveTab, addChatMessage, setConversationContext, log, displayStructure, fetchSandboxFiles,
    waitForPreviewHealthy, probePreviewHealth, ensureProjectNameForAction, persistProjectDurably,
    attachE2bSandbox, submitPreviewErrorForFixRef, submitPreviewHealthForFixRef,
  ]);

  const handleApplyError = useCallback((errorMessage: string) => {
    transitionApplyPipelineState('failed', `apply exception: ${errorMessage || 'unknown'}`);
    setCodeApplicationState({ stage: null });
  }, [transitionApplyPipelineState, setCodeApplicationState]);

  const cleanupPipeline = useCallback(() => {
    const terminalState = applyPipelineStateRef.current;
    if (terminalState === 'succeeded' || terminalState === 'failed') {
      transitionApplyPipelineState('idle', 'cleanup after terminal state');
    } else if (terminalState !== 'idle') {
      console.warn(`[apply-pipeline] Forced reset from non-terminal state: ${terminalState}`);
      applyPipelineStateRef.current = 'idle';
    }
    setGenerationProgress(prev => ({ ...prev, isEdit: false }));
  }, [applyPipelineStateRef, transitionApplyPipelineState, setGenerationProgress]);

  return { validateAndStartPipeline, handleApplySuccess, handleApplyError, cleanupPipeline };
}
