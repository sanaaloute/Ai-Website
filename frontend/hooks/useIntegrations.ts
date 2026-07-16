import { useCallback, useMemo, useRef } from 'react';
import { downloadZip as _downloadZip } from '@/lib/generation/downloadZip';
import { deployToVercel, extractPlanLimitError, getVercelStatus, getSandboxFiles, preparePocketbaseDeploy, pushToGithub, runCommand } from '@/lib/api/client';
import { backendApiUrl } from '@/lib/api/backendConfig';
import { normalizeGithubRepoUrl } from '@/lib/github';
import { useEntitlementsStore } from '@/stores/entitlementsStore';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import { assertCurrentSandboxIdStrict } from '@/lib/sandbox/sandboxClientSession';
import type { ChatMessage, ConversationContext } from '@/hooks/useWorkspaceChat';
import type { DatabaseConnectionValue } from '@/components/builder/GenerationDialogs';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface IntegrationsDeps {
  // Sandbox / project state
  sandboxData: SandboxData | null;
  conversationContext: ConversationContext;

  // UI setters
  setIsDownloadingZip: (v: boolean) => void;
  setZipNotice: (v: { status: string; message: string } | null) => void;
  setVercelDeployCard: React.Dispatch<
    React.SetStateAction<{
      status: 'deploying' | 'success' | 'failed';
      message: string;
      domainUrl?: string;
      projectName?: string;
      siteTitle?: string;
      appUuid?: string;
      deploymentStatus?: string;
      commitMessage?: string;
      isPolling?: boolean;
    } | null>
  >;
  lastGithubRepoUrl: string | null;
  setLastGithubRepoUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setProjectNameSuggestion: (v: string) => void;
  setSiteTitleSuggestion: (v: string) => void;
  setPendingNamedAction: React.Dispatch<
    React.SetStateAction<
      | { kind: 'save'; saveReason: 'manual' | 'auto-generation-success' }
      | { kind: 'github-open' }
      | { kind: 'vercel-deploy' }
      | null
    >
  >;
  setProjectNameDialogOpen: (v: boolean) => void;
  setProjectNameConfirming: (v: boolean) => void;
  setGithubPushDialogOpen: (v: boolean) => void;
  setGithubPushResult: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error'; message: string } | null>>;
  setVercelDeployDialogOpen: (v: boolean) => void;
  setVercelDeployResult: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error'; message: string } | null>>;
  setIntegrationBusy: (v: 'github' | 'vercel' | null) => void;
  setConversationContext: React.Dispatch<React.SetStateAction<ConversationContext>>;
  currentSessionProjectId: string | null;

  // Refs
  zipNoticeTimerRef: React.MutableRefObject<number | null>;
  integrationBlockedSinceRef: React.MutableRefObject<number | null>;
  lastIntegrationDeadlockAlertAtRef: React.MutableRefObject<number>;

  // Callbacks / helpers passed from page
  log: (message: string, type?: 'info' | 'error' | 'command') => void;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
  suggestProjectName: () => string;
  requestAutoRestorePreferredProject: (preferredProjectId?: string | null) => string | null;
  createSandbox: (
    options?:
      | boolean
      | {
          fromHomeScreen?: boolean;
          skipInitialFileFetch?: boolean;
          preserveProjectContext?: boolean;
          preserveCloudSelectionId?: string;
        }
  ) => Promise<unknown>;
  applyGeneratedCode: (code: string, isEdit?: boolean, overrideSandboxData?: SandboxData) => Promise<void>;
  persistProjectDurably: (
    saveReason: 'manual' | 'auto-generation-success',
    projectNameOverride?: string
  ) => Promise<boolean>;

  // Readiness
  integrationReadiness: {
    ready: boolean;
    reasons: string[];
    primaryReason: string | null;
  };

  // Derived state used by callbacks
  pendingNamedAction:
    | { kind: 'save'; saveReason: 'manual' | 'auto-generation-success' }
    | { kind: 'github-open' }
    | { kind: 'vercel-deploy' }
    | null;
}

export function useIntegrations(deps: IntegrationsDeps) {
  const {
    sandboxData,
    conversationContext,
    setIsDownloadingZip,
    setZipNotice,
    setVercelDeployCard,
    lastGithubRepoUrl,
    setLastGithubRepoUrl,
    setProjectNameSuggestion,
    setSiteTitleSuggestion,
    setPendingNamedAction,
    setProjectNameDialogOpen,
    setProjectNameConfirming,
    setGithubPushDialogOpen,
    setGithubPushResult,
    setVercelDeployDialogOpen,
    setVercelDeployResult,
    setIntegrationBusy,
    setConversationContext,
    currentSessionProjectId,
    zipNoticeTimerRef,
    integrationBlockedSinceRef,
    lastIntegrationDeadlockAlertAtRef,
    log,
    addChatMessage,
    suggestProjectName,
    requestAutoRestorePreferredProject,
    createSandbox,
    applyGeneratedCode,
    persistProjectDurably,
    integrationReadiness,
    pendingNamedAction,
  } = deps;

  // Ref to remember a pending Vercel deploy domain when GitHub repo is missing
  const pendingVercelDeployDomainRef = useRef<string | null>(null);

  const downloadZip = useCallback(async () => {
    await _downloadZip({
      sandboxData,
      zipNoticeTimerRef,
      setIsDownloadingZip,
      setZipNotice: setZipNotice as (v: { status: string; message: string } | null) => void,
      log,
      addChatMessage,
      conversationContext: conversationContext as { currentProject: string },
      projectId: currentSessionProjectId,
    });
  }, [
    sandboxData,
    zipNoticeTimerRef,
    setIsDownloadingZip,
    setZipNotice,
    log,
    addChatMessage,
    conversationContext,
    currentSessionProjectId,
  ]);

  const collectSandboxFilesForExport = useCallback(
    async (retryCount: number = 0): Promise<{ path: string; content: string }[]> => {
      // Recursive worker kept inside the callback so the sandbox-restore retry
      // never references the callback binding before it is initialized.
      const collectAttempt = async (
        attempt: number
      ): Promise<{ path: string; content: string }[]> => {
        const exportSandboxId = sandboxData?.sandboxId;
        if (exportSandboxId && !assertCurrentSandboxIdStrict(exportSandboxId, 'collectSandboxFilesForExport')) {
          throw new Error('Sandbox has changed. Please retry the export.');
        }
        const result = exportSandboxId
          ? await getSandboxFiles(exportSandboxId, 1000)
          : { ok: false as const, status: 400, statusText: 'Bad Request', error: 'Missing sandboxId' };

        const data = result.ok
          ? result.data
          : {
              success: false as const,
              files: undefined,
              error: result.error,
              code: undefined,
            };

        if (result.ok && data.success && data.files) {
          const files = Object.entries(data.files).map(([path, content]) => ({
            path,
            content: content ?? '',
          }));
          // Inject user's website title into index.html for deployment
          const siteTitle = conversationContext.siteTitle || conversationContext.currentProject || 'My App';
          const indexHtmlIdx = files.findIndex((f) => f.path === 'index.html' || f.path === '/index.html');
          if (indexHtmlIdx >= 0) {
            const html = files[indexHtmlIdx].content;
            const titled = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(siteTitle)}</title>`);
            files[indexHtmlIdx] = { ...files[indexHtmlIdx], content: titled };
          }
          // Always merge the PocketBase deployment overlay (nginx, docker-compose,
          // PocketBase migrations/Dockerfile) into the repo. PocketBase is a core
          // part of every generated project, so it is not optional.
          try {
            const pbProjectName = conversationContext.currentProject || 'ai-website-app';
            // The template copy already placed the correct category's PocketBase
            // migrations in the sandbox (pocketbase/pb_migrations/<ts>_<category>.js).
            // Detect it so the deployment overlay renders the SAME category —
            // otherwise it falls back to ecommerce and would add a wrong-schema
            // migration next to the correct one.
            const pbCategory = files
              .map((f) => f.path.match(/^pocketbase\/pb_migrations\/\d+_(.+)\.js$/))
              .find((m) => m && m[1] !== 'seed_admin_user')?.[1];
            const pbDeployment = await preparePocketbaseDeploy({
              projectName: pbProjectName,
              domain: pbProjectName,
              category: pbCategory,
            });
            if (pbDeployment.ok && pbDeployment.data.files?.length) {
              const existingPaths = new Set(files.map((f) => f.path));
              for (const file of pbDeployment.data.files) {
                if (existingPaths.has(file.path)) {
                  // Deployment overlay takes precedence for deployment-critical files.
                  const idx = files.findIndex((f) => f.path === file.path);
                  if (idx >= 0) files[idx] = file;
                } else {
                  files.push(file);
                }
              }
            }
          } catch (pbErr) {
            console.warn('[collectSandboxFilesForExport] Could not merge PocketBase overlay:', pbErr);
          }

          return files;
        }

        const status = result.ok ? 200 : result.status;
        const sandboxMissing = status === 404 || status === 410;
        if (sandboxMissing && attempt < 1) {
          addChatMessage('Sandbox expired/unavailable. Restoring last generation for export…', 'system');
          try {
            requestAutoRestorePreferredProject();
            const newSandbox = await createSandbox({
              fromHomeScreen: true,
              preserveProjectContext: true,
            });
            if (conversationContext.lastGeneratedCode) {
              const isEdit = conversationContext.appliedCode.length > 0;
              if (newSandbox) {
                await applyGeneratedCode(conversationContext.lastGeneratedCode, isEdit, newSandbox as SandboxData);
              }
            } else {
              await new Promise((r) => setTimeout(r, 500));
            }
            await new Promise((r) => setTimeout(r, 1200));
          } catch {
            // If restore fails, fall through to original error.
          }

          return collectAttempt(attempt + 1);
        }

        throw new Error(data.error || 'Could not read sandbox files.');
      };

      return collectAttempt(retryCount);
    },
    [sandboxData, addChatMessage, requestAutoRestorePreferredProject, createSandbox, conversationContext, applyGeneratedCode]
  );

  const slugifyExportName = useCallback((name: string, fallback: string) => {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_.]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);
    return slug || fallback;
  }, []);

  const defaultGithubRepoName = useMemo(
    () => slugifyExportName(conversationContext.currentProject || 'ai-website-export', 'ai-website-export'),
    [conversationContext.currentProject, slugifyExportName]
  );

  const explainIntegrationBlocked = useCallback(
    (target: 'github' | 'vercel') => {
      const actionLabel =
        target === 'github' ? 'push to GitHub' : target === 'vercel' ? 'host on Vercel' : 'host on Vercel';
      const reason = integrationReadiness.primaryReason;
      if (reason) {
        addChatMessage(`Cannot ${actionLabel} yet: ${reason}`, 'system');
      } else {
        addChatMessage(`Cannot ${actionLabel} yet. Wait for generation/apply to complete.`, 'system');
      }
    },
    [integrationReadiness.primaryReason, addChatMessage]
  );

  const runVercelDeploy = useCallback(
    async (customDomain?: string, repoUrlOverride?: string) => {
      const projectName = conversationContext.currentProject || 'ai-website-app';
      const siteTitle = conversationContext.siteTitle || projectName;

      const effectiveRepoUrl = normalizeGithubRepoUrl(repoUrlOverride || lastGithubRepoUrl);
      if (!effectiveRepoUrl) {
        // No GitHub repo yet — open push dialog so user can push first
        pendingVercelDeployDomainRef.current = customDomain || null;
        setVercelDeployCard({
          status: 'deploying',
          message: 'GitHub repository required. Opening push dialog...',
          projectName,
          siteTitle,
          domainUrl: customDomain,
          isPolling: false,
        });
        setGithubPushDialogOpen(true);
        addChatMessage('Push your code to GitHub first, then deployment will continue automatically.', 'system');
        return;
      }

      setVercelDeployCard({
        status: 'deploying',
        message: 'Triggering PocketBase deployment on Vercel...',
        projectName,
        siteTitle,
        domainUrl: customDomain,
        isPolling: true,
      });
      let appUuid: string | undefined;
      let isUpdate = false;
      try {
        const frontendDomain = (customDomain || '').replace(/^https?:\/\//, '');
        const result = await deployToVercel({
          repoUrl: effectiveRepoUrl,
          projectName,
          frontendDomain,
          projectId: currentSessionProjectId || undefined,
        });
        if (!result.ok) {
          const planLimit = extractPlanLimitError(result);
          if (planLimit) {
            useEntitlementsStore.getState().openUpgradeDialog(planLimit);
          }
          const cleanError = result.error || `Deploy failed (${result.status})`;
          setVercelDeployResult({ type: 'error', message: cleanError });
          setVercelDeployCard({
            status: 'failed',
            message: cleanError,
            projectName,
            siteTitle,
            domainUrl: customDomain,
            isPolling: false,
          });
          return;
        }
        const body = result.data;
        appUuid = body.appUuid;
        const deploymentUuid = body.deploymentUuid;
        isUpdate = !!body.isUpdate;
        const domainUrl = body.domainUrl;

        // Initial success: the app was created/updated and deploy triggered
        setVercelDeployResult({ type: 'success', message: isUpdate ? 'Redeploy triggered!' : 'Deploy triggered!' });
        setVercelDeployCard({
          status: 'deploying',
          message: isUpdate ? 'Redeploy triggered — monitoring build progress...' : 'Deploy triggered — monitoring build progress...',
          projectName,
          siteTitle,
          domainUrl,
          appUuid,
          isPolling: true,
        });

        // Track the deployment UUID for status polling
        const effectiveDeploymentUuid = deploymentUuid;

        // ── Poll Vercel for real deployment status ──
        if (appUuid) {
          const pollInterval = 5000; // 5 seconds
          const maxAttempts = 60; // ~5 minutes (builds can take a while)
          let attempts = 0;
          let deploymentFinishedAt: number | null = null;
          let verifyingStartedAt: number | null = null;

          /** Map raw Coolify statuses to user-friendly messages */
          const describeStatus = (
            deployStatus: string | undefined,
            appStatus: string | undefined
          ): { message: string; statusLabel: string; isTerminal: boolean; isSuccess: boolean; isFailed: boolean } => {
            const d = (deployStatus || '').toLowerCase();
            const a = (appStatus || '').toLowerCase();

            // Deployment-level terminal states
            if (d === 'failed') {
              return { message: 'Deployment failed on Vercel.', statusLabel: 'failed', isTerminal: true, isSuccess: false, isFailed: true };
            }
            if (d === 'cancelled' || d === 'cancelled-by-user') {
              return { message: 'Deployment was cancelled.', statusLabel: 'cancelled', isTerminal: true, isSuccess: false, isFailed: true };
            }

            // Deployment finished — now wait for app to be healthy
            if (d === 'finished') {
              if (a === 'running') {
                return { message: isUpdate ? 'Redeploy completed successfully!' : 'Deployment completed successfully!', statusLabel: 'live', isTerminal: true, isSuccess: true, isFailed: false };
              }
              if (a === 'restarting' || a === 'starting') {
                return { message: 'Deploy finished — container is starting up...', statusLabel: 'starting', isTerminal: false, isSuccess: false, isFailed: false };
              }
              if (a === 'unhealthy' || a === 'degraded') {
                // During startup, app may briefly be unhealthy; don't treat as error immediately
                return { message: 'Deploy finished — waiting for health checks...', statusLabel: 'health-check', isTerminal: false, isSuccess: false, isFailed: false };
              }
              if (a === 'stopped' || a === 'exited') {
                return { message: 'Deploy finished, but container is stopped. Check application logs.', statusLabel: 'stopped', isTerminal: true, isSuccess: false, isFailed: true };
              }
              // App status unknown/null while deployment finished — still observing
              return { message: 'Deploy finished — verifying container status...', statusLabel: 'verifying', isTerminal: false, isSuccess: false, isFailed: false };
            }

            // Active deployment phases
            if (d === 'queued' || d === 'pending') {
              return { message: 'Queued on Vercel — waiting for build slot...', statusLabel: 'queued', isTerminal: false, isSuccess: false, isFailed: false };
            }
            if (d === 'in_progress' || d === 'in-progress' || d === 'building' || d === 'deploying') {
              return { message: 'Building and deploying on Vercel...', statusLabel: 'building', isTerminal: false, isSuccess: false, isFailed: false };
            }
            if (d === 'preparing') {
              return { message: 'Preparing build environment...', statusLabel: 'preparing', isTerminal: false, isSuccess: false, isFailed: false };
            }

            // No deployment status yet — app-level status only
            if (a === 'running' || a === 'active') {
              return { message: 'Application is running.', statusLabel: 'live', isTerminal: true, isSuccess: true, isFailed: false };
            }
            if (a === 'restarting' || a === 'starting' || a === 'building' || a === 'deploying') {
              return { message: 'Container is starting up...', statusLabel: 'starting', isTerminal: false, isSuccess: false, isFailed: false };
            }
            if (a === 'unhealthy') {
              return { message: 'Container is unhealthy — may still be starting...', statusLabel: 'unhealthy', isTerminal: false, isSuccess: false, isFailed: false };
            }
            if (a === 'degraded') {
              return { message: 'Container is degraded — some services may still be starting...', statusLabel: 'degraded', isTerminal: false, isSuccess: false, isFailed: false };
            }
            if (a === 'stopped' || a === 'exited') {
              return { message: 'Container is stopped.', statusLabel: 'stopped', isTerminal: true, isSuccess: false, isFailed: true };
            }

            // Unknown/null state — show a more descriptive message instead of generic 'connecting'
            return { message: 'Waiting for Vercel status...', statusLabel: 'polling', isTerminal: false, isSuccess: false, isFailed: false };
          };

          const poll = async () => {
            attempts++;
            try {
              const statusResult = await getVercelStatus({
                deploymentUuid: effectiveDeploymentUuid,
                appUuid: appUuid!,
              });
              if (!statusResult.ok) {
                if (attempts >= maxAttempts) {
                  setVercelDeployCard((prev) =>
                    prev
                      ? {
                          ...prev,
                          isPolling: false,
                          message: 'Deploy triggered, but status polling timed out. Check your site link below.',
                        }
                      : null
                  );
                } else {
                  setTimeout(poll, pollInterval);
                }
                return;
              }
              const statusBody = statusResult.ok
                ? statusResult.data
                : {
                    success: false,
                    app: undefined,
                    latestDeployment: undefined,
                  };
              const appStatus = statusBody.app?.status;
              const deployStatus = statusBody.latestDeployment?.status;
              const deployMessage = statusBody.latestDeployment?.commit_message;

              const descriptor = describeStatus(deployStatus, appStatus);

              // Track how long we've been in the verifying state
              if (descriptor.statusLabel === 'verifying') {
                if (!verifyingStartedAt) {
                  verifyingStartedAt = Date.now();
                }
              } else {
                verifyingStartedAt = null;
              }

              // After 30 seconds in verifying, force success / deployed
              if (verifyingStartedAt && (Date.now() - verifyingStartedAt) >= 30000) {
                setVercelDeployCard((prev) =>
                  prev
                    ? {
                        ...prev,
                        status: 'success',
                        message: isUpdate ? 'Redeploy completed successfully!' : 'Deployment completed successfully!',
                        deploymentStatus: 'deployed',
                        isPolling: false,
                      }
                    : null
                );
                return;
              }

              if (descriptor.isFailed) {
                setVercelDeployCard((prev) =>
                  prev
                    ? {
                        ...prev,
                        status: 'failed',
                        message: descriptor.message,
                        deploymentStatus: descriptor.statusLabel,
                        commitMessage: deployMessage,
                        isPolling: false,
                      }
                    : null
                );
                return;
              }

              if (descriptor.isSuccess) {
                setVercelDeployCard((prev) =>
                  prev
                    ? {
                        ...prev,
                        status: 'success',
                        message: descriptor.message,
                        deploymentStatus: descriptor.statusLabel,
                        commitMessage: deployMessage,
                        isPolling: false,
                      }
                    : null
                );
                return;
              }

              // Track when deployment first reports finished so we can give
              // the container a grace period to become healthy.
              if (deployStatus?.toLowerCase() === 'finished' && !deploymentFinishedAt) {
                deploymentFinishedAt = Date.now();
              }

              // Still in progress
              setVercelDeployCard((prev) =>
                prev
                  ? {
                      ...prev,
                      message: descriptor.message,
                      deploymentStatus: descriptor.statusLabel,
                      commitMessage: deployMessage,
                      isPolling: true,
                    }
                  : null
              );

              // Continue polling?
              const gracePeriodMs = 30000; // 30s grace after deploy finishes for container to start
              const withinGracePeriod = deploymentFinishedAt && (Date.now() - deploymentFinishedAt) < gracePeriodMs;
              const shouldContinue = attempts < maxAttempts || withinGracePeriod;

              if (shouldContinue && !descriptor.isTerminal) {
                setTimeout(poll, pollInterval);
              } else if (attempts >= maxAttempts) {
                setVercelDeployCard((prev) =>
                  prev
                    ? {
                        ...prev,
                        isPolling: false,
                        message: 'Deploy triggered, but status polling timed out. Check your site link below.',
                      }
                    : null
                );
              }
            } catch {
              if (attempts >= maxAttempts) {
                setVercelDeployCard((prev) =>
                  prev
                    ? {
                        ...prev,
                        isPolling: false,
                        message: 'Deploy triggered, but status polling timed out. Check your site link below.',
                      }
                    : null
                );
              } else {
                setTimeout(poll, pollInterval);
              }
            }
          };

          // Start polling after a short delay to let Vercel queue the deploy
          setTimeout(poll, 3000);
        }
      } catch (e) {
        const cleanError = e instanceof Error ? e.message : 'Vercel deploy failed';
        setVercelDeployResult({ type: 'error', message: cleanError });
        setVercelDeployCard({
          status: 'failed',
          message: cleanError,
          projectName,
          siteTitle,
          domainUrl: customDomain,
          isPolling: false,
        });
      }
    },
    [setVercelDeployCard, setVercelDeployResult, conversationContext.currentProject, conversationContext.siteTitle, lastGithubRepoUrl, currentSessionProjectId, setGithubPushDialogOpen, addChatMessage]
  );

  const requestProjectNameForAction = useCallback(
    (
      action:
        | { kind: 'save'; saveReason: 'manual' | 'auto-generation-success' }
        | { kind: 'github-open' }
        | { kind: 'vercel-deploy' }
    ) => {
      const suggested = suggestProjectName();
      setProjectNameSuggestion(suggested);
      setSiteTitleSuggestion(conversationContext.siteTitle || suggested);
      setPendingNamedAction(action);
      setProjectNameDialogOpen(true);
    },
    [suggestProjectName, setProjectNameSuggestion, setSiteTitleSuggestion, setPendingNamedAction, setProjectNameDialogOpen, conversationContext.siteTitle]
  );

  const ensureProjectNameForAction = useCallback(
    (
      action:
        | { kind: 'save'; saveReason: 'manual' | 'auto-generation-success' }
        | { kind: 'github-open' }
        | { kind: 'vercel-deploy' }
    ): boolean => {
      const existing = (conversationContext.currentProject || '').trim();

      // Manual save / re-save should always show the naming dialog so the user
      // can create or update ai-website.json instead of silently falling back to
      // "Untitled Project".
      if (action.kind === 'save' && action.saveReason === 'manual') {
        requestProjectNameForAction(action);
        return false;
      }

      if (existing) return true;
      requestProjectNameForAction(action);
      return false;
    },
    [conversationContext.currentProject, requestProjectNameForAction]
  );

  const runNamedAction = useCallback(
    async (
      action:
        | { kind: 'save'; saveReason: 'manual' | 'auto-generation-success' }
        | { kind: 'github-open' }
        | { kind: 'vercel-deploy' },
      confirmedProjectName: string,
      confirmedSiteTitle: string
    ) => {
      const name = confirmedProjectName.trim();
      const siteTitle = confirmedSiteTitle.trim() || name;
      if (!name) return;
      setConversationContext((prev) => ({ ...prev, currentProject: name, siteTitle }));

      if (action.kind === 'save') {
        await persistProjectDurably(action.saveReason, name);
        return;
      }
      if (action.kind === 'github-open') {
        // Open after the naming dialog closes to avoid modal overlap.
        window.setTimeout(() => setGithubPushDialogOpen(true), 0);
        return;
      }
      await runVercelDeploy(name);
    },
    [setConversationContext, persistProjectDurably, setGithubPushDialogOpen, runVercelDeploy]
  );

  const confirmProjectNameAndContinue = useCallback(
    async (name: string, siteTitle: string) => {
      if (!pendingNamedAction) return;
      setProjectNameConfirming(true);
      try {
        setProjectNameDialogOpen(false);
        setPendingNamedAction(null);
        await runNamedAction(pendingNamedAction, name, siteTitle);
      } finally {
        setProjectNameConfirming(false);
      }
    },
    [pendingNamedAction, setProjectNameConfirming, setProjectNameDialogOpen, setPendingNamedAction, runNamedAction]
  );

  const cancelProjectNameAndPendingAction = useCallback(() => {
    setProjectNameDialogOpen(false);
    setPendingNamedAction(null);
  }, [setProjectNameDialogOpen, setPendingNamedAction]);

  const hostOnVercel = useCallback(async () => {
    if (!integrationReadiness.ready) {
      explainIntegrationBlocked('vercel');
      return;
    }
    if (!ensureProjectNameForAction({ kind: 'vercel-deploy' })) {
      return;
    }
    setVercelDeployDialogOpen(true);
  }, [
    integrationReadiness.ready,
    explainIntegrationBlocked,
    ensureProjectNameForAction,
    setVercelDeployDialogOpen,
  ]);

  const executeVercelDeploy = useCallback(
    async (customDomain: string) => {
      setIntegrationBusy('vercel');
      try {
        await runVercelDeploy(customDomain);
      } finally {
        setIntegrationBusy(null);
      }
    },
    [runVercelDeploy, setIntegrationBusy]
  );

  const openGithubPushDialog = useCallback(() => {
    if (!integrationReadiness.ready) {
      explainIntegrationBlocked('github');
      return;
    }
    if (!ensureProjectNameForAction({ kind: 'github-open' })) {
      return;
    }
    setGithubPushDialogOpen(true);
  }, [integrationReadiness.ready, explainIntegrationBlocked, ensureProjectNameForAction, setGithubPushDialogOpen]);

  const executeGithubPush = useCallback(
    async (repoName: string) => {
      if (!integrationReadiness.ready) {
        explainIntegrationBlocked('github');
        return;
      }
      setIntegrationBusy('github');

      // Guard the entire push sequence against hanging forever.
      const pushController = new AbortController();
      const pushTimeout = window.setTimeout(() => pushController.abort(), 120_000);

      try {
        // Regenerate package-lock.json so deployment servers can run npm ci reliably.
        // The agent often edits package.json without updating the lock file.
        if (sandboxData?.sandboxId) {
          const npmController = new AbortController();
          const npmTimeout = window.setTimeout(() => npmController.abort(), 90_000);
          try {
            addChatMessage('Syncing dependencies before push...', 'system');
            const npmResult = await runCommand(sandboxData.sandboxId, 'npm install', npmController.signal);
            const npmBody = (npmResult.ok ? npmResult.data : {}) as { success?: boolean; output?: string; error?: string };
            if (npmBody.success) {
              addChatMessage('Dependencies synced. Collecting files for push...', 'system');
            } else {
              console.warn('[executeGithubPush] npm install warning:', npmBody.error || npmBody.output);
              addChatMessage('Dependency sync had warnings, continuing with push...', 'system');
            }
          } catch (npmErr) {
            console.warn('[executeGithubPush] npm install failed:', npmErr);
            addChatMessage('Could not sync dependencies, pushing current files...', 'system');
          } finally {
            window.clearTimeout(npmTimeout);
          }
        }

        const files = await collectSandboxFilesForExport();
        if (files.length === 0) {
          setGithubPushResult({ type: 'error', message: 'No files were read from the sandbox yet. Generate or apply code first.' });
          return;
        }
        const finalName = slugifyExportName(
          conversationContext.currentProject || repoName,
          'ai-website-export'
        );
        const result = await pushToGithub(
          { repoName: finalName, files, aiWebsiteProjectId: currentSessionProjectId || undefined },
          pushController.signal
        );
        if (!result.ok) {
          const planLimit = extractPlanLimitError(result);
          if (planLimit) {
            useEntitlementsStore.getState().openUpgradeDialog(planLimit);
          }
          const cleanError = result.error || `Push failed (${result.status})`;
          if (/session expired|reconnect/i.test(cleanError)) {
            const next = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
            window.location.href = backendApiUrl(`/api/github/authorize?next=${encodeURIComponent(next)}`);
            setGithubPushResult({ type: 'error', message: 'GitHub session expired. Redirecting to reconnect… After authorizing, try pushing again.' });
            return;
          }
          setGithubPushResult({ type: 'error', message: cleanError });
          return;
        }
        const body = result.data;
        if (body.uploaded === 0) {
          setGithubPushResult({ type: 'error', message: 'Push succeeded but 0 files were uploaded. The repository may be empty.' });
          return;
        }
        const successMsg = `Pushed ${body.uploaded} file(s) to GitHub.`;
        setGithubPushResult({ type: 'success', message: successMsg });
        const normalizedRepoUrl = normalizeGithubRepoUrl(body.repoUrl);
        if (normalizedRepoUrl) {
          setLastGithubRepoUrl(normalizedRepoUrl);
          // Auto-retry pending Vercel deploy if there is one
          if (pendingVercelDeployDomainRef.current !== null) {
            const domain = pendingVercelDeployDomainRef.current;
            pendingVercelDeployDomainRef.current = null;
            window.setTimeout(() => {
              runVercelDeploy(domain || undefined, normalizedRepoUrl);
            }, 600);
          }
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          setGithubPushResult({ type: 'error', message: 'Push timed out after 2 minutes. Please try again.' });
        } else {
          const cleanError = e instanceof Error ? e.message : 'Push to GitHub failed';
          setGithubPushResult({ type: 'error', message: cleanError });
        }
      } finally {
        window.clearTimeout(pushTimeout);
        setIntegrationBusy(null);
      }
    },
    [
      integrationReadiness.ready,
      explainIntegrationBlocked,
      setIntegrationBusy,
      collectSandboxFilesForExport,
      setGithubPushResult,
      slugifyExportName,
      addChatMessage,
      sandboxData,
      conversationContext.currentProject,
      setLastGithubRepoUrl,
      runVercelDeploy,
      currentSessionProjectId,
    ]
  );

  const saveDatabaseConnection = useCallback(
    (v: DatabaseConnectionValue) => {
      setConversationContext((prev) => ({ ...prev, databaseConnection: v }));
      const label = v.type === 'supabase' ? 'Supabase' : 'MongoDB';
      addChatMessage(
        `Database context saved (${label}). Future generations will use these connection details in context.`,
        'system'
      );
    },
    [setConversationContext, addChatMessage]
  );

  return {
    // Refs (returned so page can still access them if needed, or just pass through)
    zipNoticeTimerRef,
    integrationBlockedSinceRef,
    lastIntegrationDeadlockAlertAtRef,

    // Callbacks
    downloadZip,
    collectSandboxFilesForExport,
    slugifyExportName,
    defaultGithubRepoName,
    explainIntegrationBlocked,
    runVercelDeploy,
    requestProjectNameForAction,
    ensureProjectNameForAction,
    runNamedAction,
    confirmProjectNameAndContinue,
    cancelProjectNameAndPendingAction,
    hostOnVercel,
    executeVercelDeploy,
    openGithubPushDialog,
    executeGithubPush,
    saveDatabaseConnection,
  };
}
