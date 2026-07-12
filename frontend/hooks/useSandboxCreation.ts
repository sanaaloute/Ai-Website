import { useCallback } from 'react';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import type { ChatMessage, ConversationContext } from '@/hooks/useWorkspaceChat';
import type { GenerationProgress } from '@/hooks/useGenerationProgress';
import { attachE2bSandbox as _attachE2bSandbox } from '@/lib/generation/sandboxActions';
import { getErrorMessage, type JsonEnvelope } from '@/lib/generation/pageUtils';
import { mapSandboxFilesToGenerationFiles } from '@/hooks/useCloudPersistence';
import { setLastCreatedSandbox } from '@/lib/sandbox/sandboxClientSession';
import { replaceGenerationSearchParams } from '@/lib/generation/urlUtils';
import { listSandboxes, resetConversationState, createSandbox as apiCreateSandbox, extractPlanLimitError } from '@/lib/api/client';
import { useEntitlementsStore } from '@/stores/entitlementsStore';

/** Module-level guard: prevent sandbox creation more than once per 60s window.
 *  This stops race conditions where multiple hooks/tabs trigger creation. */
let lastSandboxCreationAt = 0;
const SANDBOX_CREATION_COOLDOWN_MS = 60_000;

export interface UseSandboxCreationDeps {
  // Sandbox state
  sandboxData: SandboxData | null;
  setSandboxData: (data: SandboxData | null) => void;

  // UI state / setters
  updateStatus: (text: string, active: boolean) => void;
  setLoading: (val: boolean) => void;
  setShowLoadingBackground: (val: boolean) => void;
  setResponseArea: (v: string[]) => void;
  setScreenshotError: (v: string | null) => void;

  // Chat / conversation
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  conversationContext: ConversationContext;
  setConversationContext: React.Dispatch<React.SetStateAction<ConversationContext>>;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;

  // Generation progress
  setGenerationProgress: React.Dispatch<React.SetStateAction<GenerationProgress>>;

  // Files
  setSandboxFiles: (files: Record<string, string>) => void;
  setFileStructure: (v: string) => void;
  setStructureContent: (v: string) => void;
  setSelectedFile: (v: string | null) => void;

  // Projects
  setActiveProjectId: (v: string | null) => void;
  setCurrentSessionProjectId: (v: string | null) => void;
  setSelectedCloudProjectId: (v: string) => void;

  // E2B
  e2bSandboxesFetched: boolean;
  e2bSandboxesLoading: boolean;
  setE2bSandboxesLoading: (v: boolean) => void;
  setE2bSandboxesError: (v: string | null) => void;
  setE2bSandboxes: (v: Array<{
    sandboxId: string;
    templateID?: string | null;
    state?: string | null;
    startedAt?: string | null;
    endAt?: string | null;
    metadata?: Record<string, unknown> | null;
  }>) => void;
  setE2bSandboxesFetched: (v: boolean) => void;
  setE2bAttachBusy: (v: boolean) => void;

  // Router / navigation
  searchParams: URLSearchParams;
  router: {
    push: (url: string, options?: { scroll?: boolean }) => void;
  };

  // Refs from useWorkspaceSandbox / page
  sandboxCreationRef: React.MutableRefObject<boolean>;
  latestSandboxDataRef: React.MutableRefObject<SandboxData | null>;
  restoreSavedProjectOnceRef: React.MutableRefObject<boolean>;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;

  // Helpers / actions
  persistSnapshotToCloud: (sandboxId?: string) => Promise<boolean>;
  requestAutoRestorePreferredProject: (preferredProjectId?: string | null) => string | null;
  displayStructure: (structure: unknown) => void;
  log: (message: string, type?: 'info' | 'error' | 'command') => void;

  // Input state used by createSandbox
  promptInput: string;
  setPromptInput: (v: string) => void;

  // Circular ref from useSandboxFiles
  fetchSandboxFilesRef: React.MutableRefObject<
    ((sandboxIdOverride?: string, options?: { suppressRecoveryMessage?: boolean }) => Promise<void>) | undefined
  >;
}

export function useSandboxCreation(deps: UseSandboxCreationDeps) {
  const {
    sandboxData,
    setSandboxData,
    updateStatus,
    setLoading,
    setShowLoadingBackground,
    setResponseArea,
    setScreenshotError,
    setChatMessages,
    conversationContext,
    setConversationContext,
    addChatMessage,
    setGenerationProgress,
    setSandboxFiles,
    setFileStructure,
    setStructureContent,
    setSelectedFile,
    setActiveProjectId,
    setCurrentSessionProjectId,
    setSelectedCloudProjectId,
    e2bSandboxesFetched,
    e2bSandboxesLoading,
    setE2bSandboxesLoading,
    setE2bSandboxesError,
    setE2bSandboxes,
    setE2bSandboxesFetched,
    setE2bAttachBusy,
    searchParams,
    router,
    sandboxCreationRef,
    latestSandboxDataRef,
    restoreSavedProjectOnceRef,
    iframeRef,
    persistSnapshotToCloud,
    requestAutoRestorePreferredProject,
    displayStructure,
    log,
    promptInput,
    setPromptInput,
    fetchSandboxFilesRef,
  } = deps;

  const loadE2bSandboxes = useCallback(async () => {
    if (e2bSandboxesFetched || e2bSandboxesLoading) return;

    setE2bSandboxesLoading(true);
    setE2bSandboxesError(null);

    try {
      const result = await listSandboxes();
      if (!result.ok) {
        throw new Error(result.error || 'Failed to list sandboxes.');
      }

      setE2bSandboxes(Array.isArray(result.data.sandboxes) ? result.data.sandboxes : []);
      setE2bSandboxesFetched(true);
    } catch (error) {
      setE2bSandboxesError(error instanceof Error ? error.message : 'Failed to load sandboxes.');
    } finally {
      setE2bSandboxesLoading(false);
    }
  }, [
    e2bSandboxesFetched,
    e2bSandboxesLoading,
    setE2bSandboxesLoading,
    setE2bSandboxesError,
    setE2bSandboxes,
    setE2bSandboxesFetched,
  ]);

  const createSandbox = useCallback(
    async (
      options:
        | boolean
        | {
            fromHomeScreen?: boolean;
            skipInitialFileFetch?: boolean;
            preserveProjectContext?: boolean;
            preserveCloudSelectionId?: string;
            projectName?: string;
            skipSetup?: boolean;
          } = false
    ): Promise<SandboxData | null> => {
      const fromHomeScreen =
        typeof options === 'boolean' ? options : Boolean(options?.fromHomeScreen);
      const skipInitialFileFetch =
        typeof options === 'object' ? Boolean(options?.skipInitialFileFetch) : false;
      const preserveProjectContext =
        typeof options === 'object' ? Boolean(options?.preserveProjectContext) : false;
      const preserveCloudSelectionId =
        typeof options === 'object'
          ? typeof options.preserveCloudSelectionId === 'string'
            ? options.preserveCloudSelectionId.trim()
            : ''
          : '';
      const projectName =
        typeof options === 'object'
          ? typeof options.projectName === 'string'
            ? options.projectName.trim()
            : undefined
          : undefined;
      const skipSetup =
        typeof options === 'object' ? Boolean(options?.skipSetup) : false;

      // Cooldown guard: ignore calls within 60s of a successful creation
      const now = Date.now();
      if (now - lastSandboxCreationAt < SANDBOX_CREATION_COOLDOWN_MS) {
        console.warn(
          `[createSandbox] Blocked: sandbox was created ${Math.round((now - lastSandboxCreationAt) / 1000)}s ago (cooldown ${SANDBOX_CREATION_COOLDOWN_MS / 1000}s).`
        );
        const candidate = latestSandboxDataRef.current;
        if (candidate?.sandboxId) {
          return candidate;
        }
        console.warn('[createSandbox] No candidate sandbox available during cooldown, allowing creation');
      }

      // Prevent duplicate sandbox creation
      if (sandboxCreationRef.current) {
        // Wait up to 120s for the in-flight creation to finish (cold sandbox + npm install can take 30-60s).
        for (let i = 0; i < 240; i += 1) {
          const candidate = latestSandboxDataRef.current;
          if (candidate?.sandboxId) {
            return candidate;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 500));
        }
        console.warn('[createSandbox] Timed out waiting for in-flight sandbox creation');
        return null;
      }

      sandboxCreationRef.current = true;

      // Best-effort final cloud flush before replacing the active sandbox.
      if (sandboxData?.sandboxId) {
        await persistSnapshotToCloud(sandboxData.sandboxId);
      }

      // Fresh sandbox usually resets project UI. Recovery paths can preserve project context.
      const preservedProjectName = preserveProjectContext
        ? (conversationContext.currentProject || '').trim()
        : '';
      setChatMessages([]);
      setConversationContext({
        scrapedWebsites: [],
        generatedComponents: [],
        appliedCode: [],
        currentProject: preservedProjectName,
        siteTitle: '',
        lastGeneratedCode: undefined,
        databaseConnection: null,
      });
      if (!preserveProjectContext) {
        setActiveProjectId(null);
        setCurrentSessionProjectId(null);
        setSelectedCloudProjectId(preserveCloudSelectionId || '');
      }
      setPromptInput('');
      setSandboxFiles({});
      setFileStructure('');
      setStructureContent('No sandbox created yet');
      setSelectedFile(null);
      setResponseArea([]);
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
        lastProcessedPosition: 0,
        estimatedPercent: 0,
        todoList: [],
        questionnaire: null,
        plan: null,
        exitPlan: false,
      });
      restoreSavedProjectOnceRef.current = false;

      void resetConversationState().catch((e) => {
        console.error('[createSandbox] Failed to reset conversation state:', e);
      });

      setLoading(true);
      setShowLoadingBackground(true);
      updateStatus('Creating sandbox...', false);
      setResponseArea([]);
      setScreenshotError(null);

      try {
        console.log('[createSandbox] calling apiCreateSandbox');
        const result = await apiCreateSandbox({
          projectName,
          skipSetup,
        });
        console.log('[createSandbox] apiCreateSandbox returned', result.ok);
        if (!result.ok) {
          const planLimit = extractPlanLimitError(result);
          if (planLimit) {
            useEntitlementsStore.getState().openUpgradeDialog(planLimit);
          }
          throw new Error(result.error || 'Failed to create sandbox.');
        }
        const data = result.data;

        if (data.success) {
          console.log('[createSandbox] data.success true');
          sandboxCreationRef.current = false; // Reset the ref on success
          lastSandboxCreationAt = Date.now();
          setSandboxData(data);
          setLastCreatedSandbox(data as SandboxData);
          updateStatus('Sandbox active', true);
          log('Sandbox created successfully!');
          log(`Sandbox ID: ${data.sandboxId}`);
          log(`URL: ${data.url}`);

          // Update URL with sandbox ID (remove ?new so effect doesn't re-run).
          // Use history.replaceState to avoid React navigation / remount, and
          // preserve the existing pathname to avoid accidentally double-prefixing
          // the locale (e.g. /en/en/generation).
          const newParams = new URLSearchParams(searchParams.toString());
          newParams.delete('new');
          newParams.delete('from');
          newParams.set('sandbox', data.sandboxId);
          replaceGenerationSearchParams(newParams);

          // Fade out loading background after sandbox loads
          setTimeout(() => {
            setShowLoadingBackground(false);
          }, 3000);

          if (data.structure) {
            displayStructure(data.structure);
          }

          // ── Populate file explorer immediately if creation API returned files ──
          if (data.files && Object.keys(data.files).length > 0) {
            setSandboxFiles(data.files);
            setFileStructure(data.structure || '');
            const genFiles = mapSandboxFilesToGenerationFiles(data.files);
            setGenerationProgress((prev) => ({
              ...prev,
              files: genFiles,
            }));
          } else if (!skipInitialFileFetch) {
            // Fallback: fetch files separately if API didn't include them
            setTimeout(() => {
              void fetchSandboxFilesRef.current?.(data.sandboxId);
            }, 1000);
          }

          // For E2B sandboxes, the Vite dev server is started by the agent after the
          // template is copied and dependencies are installed. No immediate restart needed.

          // Only add welcome message if not coming from home screen
          if (!fromHomeScreen) {
            addChatMessage(
              `Sandbox created! ID: ${data.sandboxId}. When you start building, I'll load a ready-made template and install dependencies automatically, then implement your request.\n\nTip: I automatically detect and install npm packages from your code imports (like react-router-dom, axios, etc.)`,
              'system'
            );
          }

          // Return the sandbox data so it can be used immediately
          return data;
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (error: unknown) {
        console.error('[createSandbox] Error:', error);
        updateStatus('Error', false);
        const errorMessage = getErrorMessage(error);
        log(`Failed to create sandbox: ${errorMessage}`, 'error');
        addChatMessage(`Failed to create sandbox: ${errorMessage}`, 'system');
        throw error;
      } finally {
        setLoading(false);
        sandboxCreationRef.current = false; // Reset the ref
      }
    },
    [
      sandboxCreationRef,
      latestSandboxDataRef,
      sandboxData,
      persistSnapshotToCloud,
      conversationContext,
      setChatMessages,
      setConversationContext,
      setActiveProjectId,
      setCurrentSessionProjectId,
      setSelectedCloudProjectId,
      setPromptInput,
      setSandboxFiles,
      setFileStructure,
      setStructureContent,
      setSelectedFile,
      setResponseArea,
      setGenerationProgress,
      restoreSavedProjectOnceRef,
      setLoading,
      setShowLoadingBackground,
      updateStatus,
      setScreenshotError,
      searchParams,
      router,
      displayStructure,
      log,
      addChatMessage,
      iframeRef,
    ]
  );

  const attachE2bSandbox = useCallback(
    async (targetSandboxId: string, options?: { forceReconnect?: boolean }) => {
      await _attachE2bSandbox(targetSandboxId, {
        sandboxData,
        setSandboxData,
        persistSnapshotToCloud,
        setE2bAttachBusy,
        setLoading,
        setShowLoadingBackground,
        updateStatus,
        setResponseArea,
        setScreenshotError,
        addChatMessage,
        requestAutoRestorePreferredProject,
        searchParams,
        fetchSandboxFiles: fetchSandboxFilesRef.current!,
        latestSandboxDataRef,
      });
    },
    [
      sandboxData,
      setSandboxData,
      persistSnapshotToCloud,
      setE2bAttachBusy,
      setLoading,
      setShowLoadingBackground,
      updateStatus,
      setResponseArea,
      setScreenshotError,
      addChatMessage,
      requestAutoRestorePreferredProject,
      searchParams,
      router,
    ]
  );

  return {
    createSandbox,
    loadE2bSandboxes,
    attachE2bSandbox,
  };
}
