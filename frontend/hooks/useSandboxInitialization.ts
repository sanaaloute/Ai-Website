import { useEffect, useRef } from 'react';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import type { ChatMessage } from '@/hooks/useWorkspaceChat';
import { cloneRepo, getAgentSession } from '@/lib/api/client';
import { getLastCreatedSandbox, setLastCreatedSandbox } from '@/lib/sandbox/sandboxClientSession';
import { replaceGenerationSearchParams } from '@/lib/generation/urlUtils';
import { generateProjectNameFromPrompt } from '@/lib/generation/pageUtils';

export interface UseSandboxInitializationProps {
  searchParams: URLSearchParams;
  sandboxData: SandboxData | null;
  setSandboxData: (data: SandboxData | null) => void;
  setLoading: (val: boolean) => void;
  setIsLandingBoot: (val: boolean) => void;
  createSandbox: (
    options?:
      | boolean
      | {
          fromHomeScreen?: boolean;
          skipInitialFileFetch?: boolean;
          preserveProjectContext?: boolean;
          preserveCloudSelectionId?: string;
          projectName?: string;
          skipSetup?: boolean;
        }
  ) => Promise<unknown>;
  attachE2bSandbox: (targetSandboxId: string, options?: { forceReconnect?: boolean }) => Promise<void>;
  sendChatMessage?: (input?: import('./useAgentChatMessage').SendChatMessageInput) => Promise<void>;
  /** Optional: auto-fetch cloud projects list (fires in background during restore). */
  loadCloudProjects?: () => Promise<void>;
  /** Optional: ref to openCloudProject for auto-restoring the last saved project on refresh. */
  openCloudProjectRef?: React.MutableRefObject<(projectId: string) => Promise<void>>;
  /** Optional: ref tracking the last saved project ID (read from sessionStorage). */
  lastSavedProjectIdRef?: React.MutableRefObject<string | null>;
  /** Optional: ref gating auto-restore (defaults to true). */
  autoRestorePreferredProjectRef?: React.MutableRefObject<boolean>;
  /** Optional: set project opening busy state (used during reload). */
  setProjectOpeningBusy?: (val: boolean) => void;
  /** Optional: set project opening status text. */
  setProjectOpeningStatus?: (status: string) => void;
  /** Optional: set workspace reloading flag. */
  setIsReloadingWorkspace?: (val: boolean) => void;
  /** Optional: fetch sandbox files (used after attach to ensure files are loaded before showing UI). */
  fetchSandboxFiles?: (sandboxIdOverride?: string, options?: { suppressRecoveryMessage?: boolean }) => Promise<void>;
  /** Optional: wait for preview to become healthy. */
  waitForPreviewHealthy?: (timeoutMs?: number) => Promise<boolean>;
  /** Optional: reload the preview iframe. */
  reloadPreview?: () => Promise<void>;
  /** Optional: surface error messages to the chat UI. */
  addChatMessage?: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
  /** Optional: set template clone error for fatal clone failures. */
  setTemplateCloneError?: (error: { message: string } | null) => void;
  /** Router for redirecting on fatal errors. */
  router?: { push: (path: string) => void };
}

/** Module-level lock ensures only ONE sandbox initialization runs globally
 *  even if the component remounts (StrictMode, navigation, Suspense). */
let globalInitPromise: Promise<unknown> | null = null;

/** Module-level ref for sendChatMessage so it survives unmount/remount. */
const sendChatMessageRef = { current: undefined as ((input?: import('./useAgentChatMessage').SendChatMessageInput) => Promise<void>) | undefined };

export function useSandboxInitialization({
  searchParams,
  sandboxData,
  setSandboxData,
  setLoading,
  setIsLandingBoot,
  createSandbox,
  attachE2bSandbox,
  sendChatMessage,
  loadCloudProjects,
  openCloudProjectRef,
  lastSavedProjectIdRef,
  autoRestorePreferredProjectRef,
  setProjectOpeningBusy,
  setProjectOpeningStatus,
  setIsReloadingWorkspace,
  fetchSandboxFiles,
  waitForPreviewHealthy,
  reloadPreview,
  addChatMessage,
  setTemplateCloneError,
  router,
}: UseSandboxInitializationProps) {
  // Sync module-level ref with latest prop
  sendChatMessageRef.current = sendChatMessage;

  // Track whether this effect instance has already initialized
  const hasInitialized = useRef(false);
  const sessionDataRef = useRef<{ prompt?: string; templateRepo?: string; templatePrompt?: string; projectName?: string } | null>(null);

  useEffect(() => {
    // Prevent re-entry after global lock expires (3s grace period)
    if (hasInitialized.current) return;

    void (async () => {
      // Read URL params freshly from the browser each run. Next's searchParams
      // object can be stale after we use history.replaceState to remove ?new,
      // which causes duplicate sandbox creation on HMR/remount.
      const urlParams =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : searchParams;

      const isNew = urlParams.get('new') === '1';
      const fromHome = urlParams.get('from') === 'home';
      const sandboxId = urlParams.get('sandbox');
      const sessionId = urlParams.get('session');

      // Immediately strip the "new" flag (and any legacy prompt) from the URL so a
      // subsequent refresh cannot re-trigger a new generation. Keep the session id
      // so a refresh can still recover the prompt server-side.
      if (isNew && typeof window !== 'undefined') {
        try {
          const cleanParams = new URLSearchParams(window.location.search);
          cleanParams.delete('new');
          cleanParams.delete('prompt');
          replaceGenerationSearchParams(cleanParams);
        } catch {
          // ignore
        }
      }

      // If sandbox already active, just ensure loading is false and landing boot is cleared.
      if (sandboxData?.sandboxId) {
        setIsLandingBoot(false);
        setLoading(false);
        hasInitialized.current = true;
        return;
      }

      // Resolve landing boot state from server-side session (primary) or legacy
      // sessionStorage (fallback). Using a server-side session keeps prompts out
      // of the URL and survives private browsing / cross-tab navigation.
      let landingPrompt: string | null = null;
      let landingNewProject: string | null = null;
      let promptSubmitted: string | null = null;
      let templateRepo: string | null = null;
      let templatePrompt: string | null = null;

      if (sessionId) {
        try {
          const result = await getAgentSession(sessionId);
          if (result.ok && result.data.success) {
            sessionDataRef.current = result.data.session;
            landingPrompt = typeof result.data.session.prompt === 'string' ? result.data.session.prompt : null;
            templateRepo = result.data.session.templateRepo ?? null;
            templatePrompt = result.data.session.templatePrompt ?? null;
          }
        } catch (err) {
          console.warn('[useSandboxInitialization] Failed to fetch session:', err);
        }
      }

      // Legacy fallback for bookmarks and old links.
      if (!landingPrompt && !templateRepo) {
        try {
          const promptFromUrl = urlParams.get('prompt');
          landingPrompt = sessionStorage.getItem('landingPrompt') ?? promptFromUrl;
          if (landingPrompt) {
            sessionStorage.setItem('landingPrompt', landingPrompt);
          }
          landingNewProject = sessionStorage.getItem('ai-website:landingNewProject');
          promptSubmitted = sessionStorage.getItem('ai-website:promptSubmitted');
          templateRepo = sessionStorage.getItem('ai-website:templateRepo');
          templatePrompt = sessionStorage.getItem('ai-website:templatePrompt');
        } catch {
          // sessionStorage may be unavailable
        }
      }

      if (!landingPrompt && templatePrompt) {
        landingPrompt = templatePrompt;
      }
      if (landingPrompt || landingNewProject === '1' || templateRepo) {
        setIsLandingBoot(true);
      }

      // Eagerly clear template sessionStorage so remounts don't re-trigger the flow.
      if (templateRepo) {
        try {
          sessionStorage.removeItem('ai-website:templateRepo');
          sessionStorage.removeItem('ai-website:templatePrompt');
          sessionStorage.removeItem('ai-website:landingNewProject');
        } catch {
          // ignore
        }
      }

      // If another instance is already initializing, just wait for it.
      if (globalInitPromise) {
        void globalInitPromise.then(() => {
          setLoading(false);
          setIsLandingBoot(false);
          // If this component remounted while init was in flight, restore sandbox data.
          const lastCreated = getLastCreatedSandbox();
          if (lastCreated && !sandboxData?.sandboxId) {
            setSandboxData(lastCreated);
          }
        });
        hasInitialized.current = true;
        return;
      }

      // A new landing submission should only run once. If the prompt was already
      // submitted (e.g. the page refreshed before cleanup), treat this as a
      // reconnect and attach to the existing sandbox instead of restarting.
      const isFreshLandingSubmission =
        (isNew || fromHome || templateRepo) && promptSubmitted !== '1';

      async function doInit() {
        console.log('[useSandboxInitialization] doInit start', { isNew, fromHome, sandboxId, landingPrompt: !!landingPrompt, promptSubmitted, isFreshLandingSubmission });
        try {
          if (isFreshLandingSubmission) {
            const projectName = landingPrompt
              ? generateProjectNameFromPrompt(landingPrompt)
              : undefined;
            console.log('[useSandboxInitialization] creating sandbox');
            // Gate prompt submission so a remount/refresh cannot send it twice.
            try {
              sessionStorage.setItem('ai-website:promptSubmitted', '1');
            } catch {
              // ignore
            }

            const result = await createSandbox({
              fromHomeScreen: true,
              projectName,
              skipSetup: !!templateRepo,
            });
            console.log('[useSandboxInitialization] createSandbox done', result);
            if (result && typeof result === 'object' && 'sandboxId' in result) {
              setLastCreatedSandbox(result as SandboxData);
            }
            // Clear landing boot immediately for non-template flows so the workspace shows.
            // Template flow keeps landing boot active until clone + preview are ready.
            if (!templateRepo) {
              console.log('[useSandboxInitialization] clearing landing boot');
              setIsLandingBoot(false);
            }
            // Eagerly clear the "new project" session flag so remounts/HMR don't recreate.
            try {
              sessionStorage.removeItem('ai-website:landingNewProject');
            } catch {
              // ignore
            }
          } else if (sandboxId) {
            // Refresh/reconnect with an existing sandbox: reload workspace, don't
            // show "Creating workspace" and don't restart the agent.
            // Guard: if a newer sandbox was already created (e.g. proactive renewal),
            // don't try to attach the stale URL sandbox ID.
            const currentLastCreated = getLastCreatedSandbox();
            if (currentLastCreated?.sandboxId && currentLastCreated.sandboxId !== sandboxId) {
              setSandboxData(currentLastCreated);
            } else {
              setIsReloadingWorkspace?.(true);
              setProjectOpeningBusy?.(true);
              setProjectOpeningStatus?.('Reloading your workspace...');
              try {
                await attachE2bSandbox(sandboxId);
                // Ensure files are loaded and preview is ready before showing the UI
                if (fetchSandboxFiles) {
                  await fetchSandboxFiles(sandboxId, { suppressRecoveryMessage: true });
                }
                if (waitForPreviewHealthy) {
                  await waitForPreviewHealthy(12000);
                }
              } finally {
                setProjectOpeningBusy?.(false);
                setIsReloadingWorkspace?.(false);
                setIsLandingBoot(false);
              }
            }
          } else {
            // Page refresh scenario (no new/home/sandbox params): try auto-restore
            const shouldAutoRestore =
              !landingPrompt &&
              landingNewProject !== '1' &&
              autoRestorePreferredProjectRef?.current !== false;

            const preferredProjectId =
              lastSavedProjectIdRef?.current || searchParams.get('projectId');

            if (shouldAutoRestore && preferredProjectId) {
              setIsReloadingWorkspace?.(true);
              setProjectOpeningStatus?.('Reloading your workspace...');
              // Fetch project list in background so dropdown is ready
              void loadCloudProjects?.();
              try {
                await openCloudProjectRef?.current(preferredProjectId);
              } catch (error) {
                const msg = error instanceof Error ? error.message : 'Auto-restore failed';
                console.error('[useSandboxInitialization] Auto-restore failed, creating fresh sandbox:', error);
                addChatMessage?.(`Workspace auto-restore failed: ${msg}. Creating a fresh sandbox…`, 'system');
                try {
                  const result = await createSandbox(true);
                  if (result && typeof result === 'object' && 'sandboxId' in result) {
                    setLastCreatedSandbox(result as SandboxData);
                  }
                } catch (createError) {
                  const createMsg = createError instanceof Error ? createError.message : 'Fallback creation failed';
                  console.error('[useSandboxInitialization] Fallback sandbox creation failed:', createError);
                  addChatMessage?.(`Could not create workspace: ${createMsg}. Please refresh the page.`, 'system');
                  setLoading(false);
                }
              } finally {
                setIsReloadingWorkspace?.(false);
                setIsLandingBoot(false);
              }
            } else {
              setLoading(false);
              setIsLandingBoot(false);
            }
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Workspace initialization failed';
          console.error('[useSandboxInitialization] Failed to initialize sandbox:', error);
          addChatMessage?.(`Workspace initialization failed: ${msg}. Please refresh the page.`, 'system');
          console.log('[useSandboxInitialization] catch clearing landing boot');
          setIsLandingBoot(false);
          setLoading(false);
          // Clear sessionStorage to prevent phantom retry loops on refresh
          try {
            sessionStorage.removeItem('landingPrompt');
            sessionStorage.removeItem('ai-website:landingNewProject');
            sessionStorage.removeItem('ai-website:promptSubmitted');
            sessionStorage.removeItem('ai-website:templateRepo');
            sessionStorage.removeItem('ai-website:templatePrompt');
          } catch {
            // ignore
          }
          throw error;
        }
      }

      globalInitPromise = doInit();
      hasInitialized.current = true;

      // Helper: retry an async operation with exponential backoff
      async function withRetry<T>(
        label: string,
        fn: () => Promise<T>,
        maxAttempts = 3,
        baseDelayMs = 1500
      ): Promise<T> {
        let lastError: unknown;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            return await fn();
          } catch (err) {
            lastError = err;
            console.warn(`[useSandboxInitialization] ${label} failed (attempt ${attempt}/${maxAttempts}):`, err);
            if (attempt < maxAttempts) {
              const delay = baseDelayMs * Math.pow(2, attempt - 1);
              await new Promise((r) => setTimeout(r, delay));
            }
          }
        }
        throw lastError;
      }

      globalInitPromise
        .then(async () => {
          const currentSandboxId = getLastCreatedSandbox()?.sandboxId || sandboxData?.sandboxId;

          // After sandbox is ready, clone template repo if present.
          if (templateRepo && currentSandboxId) {
            try {
              sessionStorage.removeItem('ai-website:templateRepo');
              sessionStorage.removeItem('ai-website:templatePrompt');
              sessionStorage.removeItem('ai-website:landingNewProject');
            } catch {
              // ignore
            }

            addChatMessage?.('Cloning template repository into your workspace…', 'system');
            setProjectOpeningBusy?.(true);
            setProjectOpeningStatus?.('Cloning template repository...');

            try {
              await withRetry('clone-repo', async () => {
                const result = await cloneRepo(currentSandboxId, templateRepo);
                if (!result.ok) {
                  throw new Error(result.error || 'Clone failed');
                }
                if (!result.data.success) {
                  throw new Error('Clone failed');
                }
                return result.data;
              });

              addChatMessage?.('Template loaded successfully. Refreshing file explorer…', 'system');

              // Refresh files in the UI
              await withRetry('fetchSandboxFiles', () =>
                fetchSandboxFiles?.(currentSandboxId, { suppressRecoveryMessage: true }) ?? Promise.resolve()
              );

              setProjectOpeningStatus?.('Waiting for preview...');
              await withRetry('waitForPreviewHealthy', () =>
                waitForPreviewHealthy?.(12000) ?? Promise.resolve(true)
              );

              // Force preview iframe refresh so cloned site is visible
              void reloadPreview?.();

              // Release loading state so workspace shows (even if preview had errors)
              setProjectOpeningBusy?.(false);
              setIsLandingBoot(false);

              addChatMessage?.(
                'Template loaded. The website code is in the file explorer and the preview is live. ' +
                'You can start editing by typing a message below.',
                'system'
              );
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Clone failed';
              console.error('[useSandboxInitialization] Template clone failed after retries:', err);
              addChatMessage?.(`Failed to load template: ${msg}. Redirecting to home…`, 'system');
              setProjectOpeningBusy?.(false);
              setIsLandingBoot(false);
              setTemplateCloneError?.(null);
              // Redirect to landing page so user isn't stuck on a loading screen.
              // Use the locale-aware router so we don't hit a middleware redirect.
              router?.push('/');
            }
            return;
          }

          // After sandbox is ready, auto-submit the landing prompt exactly once.
          if (landingPrompt && isFreshLandingSubmission) {
            try {
              sessionStorage.removeItem('landingPrompt');
              sessionStorage.removeItem('ai-website:landingNewProject');
              sessionStorage.removeItem('ai-website:promptSubmitted');
            } catch {
              // ignore
            }
            setIsLandingBoot(false);
            await sendChatMessageRef.current?.({
              visible: landingPrompt,
              llm: landingPrompt,
              intent: 'new_app',
            });
            return;
          }

          // If a stale prompt-submitted flag remains, clean it up so future
          // landing submissions are not blocked. Also clear any orphaned prompt
          // that was consumed but not sent (e.g. a refresh before the send).
          if (promptSubmitted === '1') {
            try {
              sessionStorage.removeItem('ai-website:promptSubmitted');
              sessionStorage.removeItem('landingPrompt');
            } catch {
              // ignore
            }
          }

          // For any remaining landing-boot scenario without a template or prompt,
          // make sure the workspace is visible.
          setIsLandingBoot(false);
        })
        .catch(() => {
          // Error already logged and loading set to false.
        })
        .finally(() => {
          // Release lock after a short grace period so page refreshes can re-init.
          window.setTimeout(() => {
            globalInitPromise = null;
          }, 3000);
        });
    })();
  }, [
    searchParams,
    sandboxData,
    setSandboxData,
    setLoading,
    setIsLandingBoot,
    createSandbox,
    attachE2bSandbox,
    loadCloudProjects,
    openCloudProjectRef,
    lastSavedProjectIdRef,
    autoRestorePreferredProjectRef,
    setProjectOpeningBusy,
    setProjectOpeningStatus,
    setIsReloadingWorkspace,
    fetchSandboxFiles,
    waitForPreviewHealthy,
    reloadPreview,
    addChatMessage,
    setTemplateCloneError,
    router,
  ]);
}
