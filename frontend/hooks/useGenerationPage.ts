'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { appConfig } from '@/config/app.config';
import { useWorkspaceSandbox } from '@/hooks/useWorkspaceSandbox';
import { useWorkspaceUI } from '@/hooks/useWorkspaceUI';
import { useWorkspaceChat } from '@/hooks/useWorkspaceChat';
import { useGenerationProgress } from '@/hooks/useGenerationProgress';
import { usePreviewHealth } from '@/hooks/usePreviewHealth';
import { useWorkspaceFiles } from '@/hooks/useWorkspaceFiles';
import { useCloudProjects } from '@/hooks/useCloudProjects';
import { useSandboxActions } from '@/hooks/useSandboxActions';
import { useCloudActions } from '@/hooks/useCloudActions';
import { usePreviewActions } from '@/hooks/usePreviewActions';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useApiKeyActions } from '@/hooks/useApiKeyActions';
import { useAgentChatMessage } from '@/hooks/useAgentChatMessage';
import { useApplyGeneratedCode } from '@/hooks/useApplyGeneratedCode';
import { AI_WEBSITE_API_KEY_SITE_URL } from '@/lib/ai/aiWebsiteApiKey';
import { mapSandboxFilesToGenerationFiles } from '@/lib/generation/pageUtils';
import { installPackages as apiInstallPackages, renewSandbox } from '@/lib/api/client';
import { LAST_SAVED_PROJECT_KEY } from '@/lib/generation/constants';
import { setLastCreatedSandbox } from '@/lib/sandbox/sandboxClientSession';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import type { CloudProjectListItem } from '@/lib/generation/types';
import {
  useSetAtom,
  useAtomValue,
} from 'jotai';
import {
  appendChatContextRequestAtom,
  previewChatDraftRequestAtom,
  selectedComponentsPreviewAtom,
  visualEditingSelectedComponentAtom,
  currentComponentCoordinatesAtom,
  previewIframeRefAtom,
  pendingVisualChangesAtom,
} from '@/lib/visual-editing/visualEditingAtoms';

export function useGenerationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Workspace Hooks ──
  const sandbox = useWorkspaceSandbox();
  const ui = useWorkspaceUI({ initialLoading: true });
  const gen = useGenerationProgress();
  const chat = useWorkspaceChat();
  const preview = usePreviewHealth({
    latestSandboxDataRef: sandbox.latestSandboxDataRef,
    latestPreviewErrorRef: sandbox.latestPreviewErrorRef,
    lastPreviewReadyAtRef: sandbox.lastPreviewReadyAtRef,
    lastPreviewIframeLoadAtRef: sandbox.lastPreviewIframeLoadAtRef,
    lastPreviewErrorAtRef: sandbox.lastPreviewErrorAtRef,
  });
  const files = useWorkspaceFiles();
  const cloud = useCloudProjects();

  // ── E2B local state (needed by useSandboxActions) ──
  const [e2bSandboxesFetched, setE2bSandboxesFetched] = useState(false);
  const [e2bSandboxesLoading, setE2bSandboxesLoading] = useState(false);
  const [, setE2bSandboxesError] = useState<string | null>(null);
  const [, setE2bSandboxes] = useState<Array<{
    sandboxId: string;
    templateID?: string | null;
    state?: string | null;
    startedAt?: string | null;
    endAt?: string | null;
    metadata?: Record<string, unknown> | null;
  }>>([]);
  const [, setE2bAttachBusy] = useState(false);

  // Destructure stable setters to avoid exhaustive-deps warnings about whole objects.
  const { setStatus: uiSetStatus, setResponseArea: uiSetResponseArea } = ui;
  const { setStructureContent: filesSetStructureContent, sandboxFiles, setActiveTab: filesSetActiveTab } = files;
  const { addChatMessage: chatAddChatMessage } = chat;
  const { setGenerationProgress: genSetGenerationProgress } = gen;
  const { sandboxCreationRef, sandboxData: sandboxDataForRef, isLandingBoot: sandboxIsLandingBoot, setSandboxData: sandboxSetSandboxData, iframeRef: sandboxIframeRef } = sandbox;
  const { setLoading: uiSetLoading, setShowLoadingBackground: uiSetShowLoadingBackground, activeProjectId: uiActiveProjectId, currentSessionProjectId: uiCurrentSessionProjectId } = ui;

  // ── Helpers ──
  const updateStatus = useCallback((text: string, active: boolean) => {
    uiSetStatus({ text, active });
  }, [uiSetStatus]);

  const log = useCallback((message: string, type: 'info' | 'error' | 'command' = 'info') => {
    uiSetResponseArea(prev => [...prev, `[${type}] ${message}`]);
  }, [uiSetResponseArea]);

  const displayStructure = useCallback((structure: unknown) => {
    if (typeof structure === 'object' && structure !== null) {
      filesSetStructureContent(JSON.stringify(structure, null, 2));
    } else {
      filesSetStructureContent(
        typeof structure === 'string' && structure ? structure : 'No structure available'
      );
    }
  }, [filesSetStructureContent]);

  // ── API Key ──
  const { ensureAiWebsiteApiKey, saveAiWebsiteApiKey } = useApiKeyActions({
    apiKeyReady: ui.apiKeyReady,
    setApiKeyReady: ui.setApiKeyReady,
    apiKeyError: ui.apiKeyError,
    setApiKeyError: ui.setApiKeyError,
    showApiKeyDialog: ui.showApiKeyDialog,
    setShowApiKeyDialog: ui.setShowApiKeyDialog,
    apiKeyInput: ui.apiKeyInput,
    setApiKeyInput: ui.setApiKeyInput,
    apiKeySaving: ui.apiKeySaving,
    setApiKeySaving: ui.setApiKeySaving,
    updateStatus: (s: string) => updateStatus(s, true),
    log: (msg: string) => log(msg, 'info'),
  });

  // ── Package installation helpers ──
  const installPackages = useCallback(async (packages: string[]) => {
    const sandboxId = sandbox.sandboxData?.sandboxId;
    if (!sandboxId) {
      chatAddChatMessage('No active sandbox. Create a sandbox first!', 'system');
      return;
    }

    const idleTimeoutMs = 90 * 1000;

    gen.setCodeApplicationState(prev => ({
      ...prev,
      stage: 'installing',
      packages,
      message: `Installing ${packages.length} package${packages.length === 1 ? '' : 's'}...`,
      installedPackages: [],
    }));
    chatAddChatMessage(`Installing packages: ${packages.join(', ')}...`, 'system');

    try {
      const res = await apiInstallPackages(sandboxId, packages);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Failed to install packages: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('No response body available for package install stream.');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      const readChunkWithTimeout = async (): Promise<ReadableStreamReadResult<Uint8Array>> => {
        return await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error('Package install stream stalled (no progress updates for 90s).'));
            }, idleTimeoutMs);
          }),
        ]);
      };

      while (true) {
        const { done, value } = await readChunkWithTimeout();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6)) as {
              type?: string;
              message?: string;
              output?: string;
              stream?: 'stdout' | 'stderr';
              package?: string;
              installedPackages?: string[];
            };

            switch (data.type) {
              case 'status':
                gen.setCodeApplicationState(prev => ({
                  ...prev,
                  stage: 'installing',
                  message: data.message || prev.message,
                }));
                break;
              case 'command-output':
                if (data.output) {
                  chatAddChatMessage(data.output, 'command', {
                    commandType: data.stream === 'stderr' ? 'error' : 'output',
                  });
                }
                break;
              case 'package-progress':
                if (data.installedPackages && data.installedPackages.length > 0) {
                  const installed = data.installedPackages;
                  gen.setCodeApplicationState(prev => ({
                    ...prev,
                    installedPackages: installed,
                    message: `Installed ${installed.length} of ${packages.length} packages...`,
                  }));
                }
                break;
              case 'success':
                if (data.package) {
                  chatAddChatMessage(`Installed ${data.package}`, 'system');
                }
                break;
              case 'error':
                if (data.package) {
                  chatAddChatMessage(`Failed to install ${data.package}: ${data.message || 'Unknown error'}`, 'system');
                }
                break;
              case 'complete':
                // handled after loop
                break;
            }
          } catch (e) {
            console.warn('[installPackages] Failed to parse SSE line:', e);
          }
        }
      }

      chatAddChatMessage(`Installed packages: ${packages.join(', ')}`, 'system');
      gen.setCodeApplicationState(prev => ({
        ...prev,
        stage: 'complete',
        message: `Installed ${packages.length} package${packages.length === 1 ? '' : 's'}.`,
        installedPackages: packages,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      chatAddChatMessage(`Failed to install packages: ${message}`, 'system');
      gen.setCodeApplicationState(prev => ({
        ...prev,
        stage: null,
        message: `Failed to install packages: ${message}`,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- depend only on gen.setCodeApplicationState; the full gen object changes on every progress update and would re-create this callback constantly
  }, [sandbox.sandboxData, chatAddChatMessage, gen.setCodeApplicationState]);

  // ── Refs ──
  const sandboxFileRecoverRef = useRef(false);
  const restoreSavedProjectOnceRef = useRef(false);
  const forceNextMessageAsEditRef = useRef(false);
  const sendChatMessageRef = useRef<((input?: import('./useAgentChatMessage').SendChatMessageInput) => Promise<void>) | null>(null);
  const abortChatMessageRef = useRef<(() => void) | null>(null);
  const addChatMessageRef = useRef(chat.addChatMessage);
  const visualEditingSelectedRef = useRef(null);

  useEffect(() => {
    addChatMessageRef.current = chat.addChatMessage;
  }, [chat.addChatMessage]);

  // Cloud refs
  const cloudProjectsRequestSeqRef = useRef(0);
  const lastKnownCloudProjectsRef = useRef<CloudProjectListItem[]>(cloud.cloudProjects);
  const preserveCloudProjectsUntilRef = useRef(0);
  const latestSnapshotRef = useRef({
    sandboxId: null as string | null,
    projectId: null as string | null,
    projectName: '',
    fileStructure: '',
    structureContent: '',
    sandboxFiles: {} as Record<string, string>,
    chat: [] as Array<{
      content: string;
      type: string;
      timestamp: number;
      metadata?: Record<string, unknown> | undefined;
    }>,
  });
  const lastSavedProjectIdRef = useRef<string | null>(null);
  const autoRestorePreferredProjectRef = useRef(true);
  const pendingAutoOpenProjectIdRef = useRef<string | null>(null);
  const openCloudProjectRef = useRef<(projectId: string) => Promise<void>>(async () => {});

  // Restore last saved project ID from sessionStorage on mount (survives page refresh)
  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(LAST_SAVED_PROJECT_KEY);
      if (stored) {
        lastSavedProjectIdRef.current = stored;
      }
    } catch {
      // ignore
    }
  }, []);

  // Integration refs
  const zipNoticeTimerRef = useRef<number | null>(null);
  const integrationBlockedSinceRef = useRef<number | null>(null);
  const lastIntegrationDeadlockAlertAtRef = useRef<number>(0);

  // Circular-dep refs
  const persistSnapshotToCloudRef = useRef<(sandboxId?: string) => Promise<boolean>>(async () => false);
  const requestAutoRestorePreferredProjectRef = useRef<(preferredProjectId?: string | null) => string | null>(() => null);
  const applyGeneratedCodeRef = useRef<(code: string, isEdit?: boolean, overrideSandboxData?: SandboxData) => Promise<void>>(async () => {});
  const onSandboxDeadRef = useRef<(() => void) | undefined>(undefined);
  const onSandboxRenewRef = useRef<(() => void) | undefined>(undefined);
  const recoveredSandboxIdRef = useRef<string | null>(null);
  const renewedSandboxIdRef = useRef<string | null>(null);
  const lastSandboxCreatedAtRef = useRef<number>(0);

  // ── Sandbox Actions ──
  const sandboxActions = useSandboxActions({
    sandboxData: sandbox.sandboxData,
    setSandboxData: sandbox.setSandboxData,
    updateStatus,
    setLoading: ui.setLoading,
    setShowLoadingBackground: ui.setShowLoadingBackground,
    setResponseArea: ui.setResponseArea,
    setScreenshotError: sandbox.setScreenshotError,
    setPreviewError: sandbox.setPreviewError,
    setPreviewHealthIssue: sandbox.setPreviewHealthIssue,
    setActiveTab: files.setActiveTab,
    chatMessages: chat.chatMessages,
    setChatMessages: chat.setChatMessages,
    conversationContext: chat.conversationContext,
    setConversationContext: chat.setConversationContext,
    addChatMessage: chat.addChatMessage,
    setGenerationProgress: gen.setGenerationProgress,
    setSandboxFiles: files.setSandboxFiles,
    setFileStructure: files.setFileStructure,
    setStructureContent: files.setStructureContent,
    setSelectedFile: files.setSelectedFile,
    selectedFile: files.selectedFile,
    setActiveProjectId: ui.setActiveProjectId,
    setCurrentSessionProjectId: ui.setCurrentSessionProjectId,
    setSelectedCloudProjectId: ui.setSelectedCloudProjectId,
    e2bSandboxesFetched,
    e2bSandboxesLoading,
    setE2bSandboxesLoading,
    setE2bSandboxesError,
    setE2bSandboxes,
    setE2bSandboxesFetched,
    setE2bAttachBusy,
    searchParams,
    router: { push: router.push },
    sandboxCreationRef: sandbox.sandboxCreationRef,
    latestSandboxDataRef: sandbox.latestSandboxDataRef,
    sandboxFileRecoverRef,
    restoreSavedProjectOnceRef,
    iframeRef: sandbox.iframeRef,
    latestPreviewErrorRef: sandbox.latestPreviewErrorRef,
    lastPreviewErrorTextRef: sandbox.lastPreviewErrorTextRef,
    lastPreviewErrorAtRef: sandbox.lastPreviewErrorAtRef,
    onSandboxDeadRef,
    persistSnapshotToCloud: async (sandboxId) => persistSnapshotToCloudRef.current(sandboxId),
    requestAutoRestorePreferredProject: (preferredProjectId?: string | null) => requestAutoRestorePreferredProjectRef.current(preferredProjectId),
    displayStructure,
    log,
    mapSandboxFilesToGenerationFiles,
    promptInput: chat.promptInput,
    setPromptInput: chat.setPromptInput,
  });
  const {
    fetchSandboxFiles: sandboxActionsFetchSandboxFiles,
    reloadPreview: sandboxActionsReloadPreview,
    createSandbox: sandboxActionsCreateSandbox,
  } = sandboxActions;

  // ── Cloud Actions ──
  const cloudActions = useCloudActions({
    currentSessionProjectId: ui.currentSessionProjectId,
    selectedCloudProjectId: ui.selectedCloudProjectId,
    activeProjectId: ui.activeProjectId,
    cloudProjects: cloud.cloudProjects,
    sandboxData: sandbox.sandboxData,
    loading: ui.loading,
    projectOpeningBusy: cloud.projectOpeningBusy,
    projectDeleteBusyId: cloud.projectDeleteBusyId,
    projectRenameBusyId: cloud.projectRenameBusyId,
    isSavingProject: ui.isSavingProject,
    generationProgressIsGenerating: gen.generationProgress.isGenerating,
    codeApplicationStateStage: gen.codeApplicationState.stage,
    fileStructure: files.fileStructure,
    structureContent: files.structureContent,
    sandboxFiles: files.sandboxFiles,
    chatMessages: chat.chatMessages,
    conversationContextCurrentProject: chat.conversationContext.currentProject,
    conversationContextSiteTitle: chat.conversationContext.siteTitle,
    setCloudProjectsLoading: cloud.setCloudProjectsLoading,
    setCloudProjectsError: cloud.setCloudProjectsError,
    setCloudProjects: cloud.setCloudProjects,
    setCurrentSessionProjectId: ui.setCurrentSessionProjectId,
    setSelectedCloudProjectId: ui.setSelectedCloudProjectId,
    setActiveProjectId: ui.setActiveProjectId,
    setConversationContext: chat.setConversationContext,
    setIsSavingProject: ui.setIsSavingProject,
    setProjectDeleteBusyId: cloud.setProjectDeleteBusyId,
    setProjectMenuOpen: ui.setProjectMenuOpen,
    setProjectOpeningBusy: cloud.setProjectOpeningBusy,
    setProjectOpeningStatus: ui.setProjectOpeningStatus,
    setRenameProjectDialogOpen: ui.setRenameProjectDialogOpen,
    setRenameProjectTarget: ui.setRenameProjectTarget,
    renameProjectTarget: ui.renameProjectTarget,
    setProjectRenameBusyId: cloud.setProjectRenameBusyId,
    setFileStructure: files.setFileStructure,
    setStructureContent: files.setStructureContent,
    setSandboxFiles: files.setSandboxFiles,
    setSandboxData: sandbox.setSandboxData,
    setGenerationProgress: gen.setGenerationProgress,
    setChatMessages: chat.setChatMessages,
    setPreviewError: sandbox.setPreviewError,
    setPreviewHealthIssue: sandbox.setPreviewHealthIssue,
    setActiveTab: files.setActiveTab,
    cloudProjectsRequestSeqRef,
    lastKnownCloudProjectsRef,
    preserveCloudProjectsUntilRef,
    latestSnapshotRef,
    lastSavedProjectIdRef,
    autoRestorePreferredProjectRef,
    pendingAutoOpenProjectIdRef,
    openCloudProjectRef,
    iframeRef: sandbox.iframeRef,
    latestSandboxDataRef: sandbox.latestSandboxDataRef,
    latestPreviewErrorRef: sandbox.latestPreviewErrorRef,
    lastPreviewErrorTextRef: sandbox.lastPreviewErrorTextRef,
    lastPreviewErrorAtRef: sandbox.lastPreviewErrorAtRef,
    searchParams,
    router,
    createSandbox: sandboxActions.createSandbox,
    fetchSandboxFiles: sandboxActions.fetchSandboxFiles,
    addChatMessage: chat.addChatMessage,
    waitForPreviewHealthy: preview.waitForPreviewHealthy,
    probePreviewHealth: preview.probePreviewHealth,
    LAST_SAVED_PROJECT_KEY,
    setLastGithubRepoUrl: ui.setLastGithubRepoUrl,
  });
  const { openCloudProject: cloudActionsOpenCloudProject } = cloudActions;

  // Wire circular refs after cloudActions is created
  useEffect(() => {
    persistSnapshotToCloudRef.current = cloudActions.persistSnapshotToCloud;
    requestAutoRestorePreferredProjectRef.current = cloudActions.requestAutoRestorePreferredProject;
  }, [cloudActions.persistSnapshotToCloud, cloudActions.requestAutoRestorePreferredProject]);

  // Auto-recovery when sandbox dies (e.g. after E2B 1h TTL)
  useEffect(() => {
    onSandboxDeadRef.current = () => {
      const deadId = sandbox.sandboxData?.sandboxId;
      if (!deadId) return;
      if (recoveredSandboxIdRef.current === deadId) return;
      if (renewedSandboxIdRef.current === deadId) return;
      if (cloud.projectOpeningBusy) return;
      if (gen.generationProgress.isGenerating) return;
      if (sandbox.isLandingBoot) return;

      // Don't recover within 60s of sandbox creation — avoids race conditions
      // where status checks on a still-booting sandbox trigger false recovery.
      const secondsSinceCreation = Math.round((Date.now() - lastSandboxCreatedAtRef.current) / 1000);
      if (secondsSinceCreation < 60) {
        return;
      }

      recoveredSandboxIdRef.current = deadId;
      chatAddChatMessage('Your sandbox has expired. Creating a fresh workspace…', 'system');

      const projectId = ui.activeProjectId || ui.currentSessionProjectId;
      if (projectId) {
        void cloudActionsOpenCloudProject(projectId).catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : 'Unknown error';
          chatAddChatMessage(`Auto-recovery failed: ${msg}. Please refresh the page.`, 'system');
        });
      } else {
        void sandboxActionsCreateSandbox(true).catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : 'Unknown error';
          chatAddChatMessage(`Could not create a new workspace: ${msg}. Please refresh the page.`, 'system');
        });
      }
    };
  }, [
    sandbox.sandboxData?.sandboxId,
    cloud.projectOpeningBusy,
    gen.generationProgress.isGenerating,
    sandbox.isLandingBoot,
    chatAddChatMessage,
    ui.activeProjectId,
    ui.currentSessionProjectId,
    cloudActionsOpenCloudProject,
    sandboxActionsCreateSandbox,
  ]);

  // Preemptive renewal before sandbox expires — migrates ALL files to a new sandbox
  useEffect(() => {
    onSandboxRenewRef.current = async () => {
      const oldId = sandboxDataForRef?.sandboxId;
      if (!oldId) return;
      if (renewedSandboxIdRef.current === oldId) return;
      if (recoveredSandboxIdRef.current === oldId) return;
      if (cloud.projectOpeningBusy) return;
      if (sandboxIsLandingBoot) return;

      // Don't renew within 60s of sandbox creation
      const secondsSinceCreation = Math.round((Date.now() - lastSandboxCreatedAtRef.current) / 1000);
      if (secondsSinceCreation < 60) {
        return;
      }

      renewedSandboxIdRef.current = oldId;
      chatAddChatMessage('⏳ Your workspace will expire soon. Extending it automatically...', 'system');
      uiSetLoading(true);
      uiSetShowLoadingBackground(true);

      try {
        const result = await renewSandbox(oldId);
        if (!result.ok) {
          throw new Error(result.error || `Renewal failed (${result.status})`);
        }
        const data = result.data;
        if (!data.success || !data.newSandboxId) {
          throw new Error(data.error || 'Renewal failed');
        }

        // Update sandbox state with new sandbox
        const newSandboxData: SandboxData = {
          sandboxId: data.newSandboxId,
          url: data.url || '',
          createdAt: data.createdAt,
          endAt: data.endAt,
        };
        sandboxSetSandboxData(newSandboxData);
        setLastCreatedSandbox(newSandboxData);
        lastSandboxCreatedAtRef.current = Date.now();

        // Update iframe src
        const iframe = sandboxIframeRef.current;
        if (iframe && data.url) {
          iframe.src = data.url;
        }

        // Update URL query param. Use the locale-agnostic pathname from next-intl
        // so the router adds the correct locale prefix and never double-prefixes.
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('sandbox', data.newSandboxId);
        router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });

        // Refresh file explorer with new sandbox
        setTimeout(() => {
          void sandboxActionsFetchSandboxFiles(data.newSandboxId!);
        }, 1500);

        const migrated = data.filesMigrated ?? 0;
        chatAddChatMessage(
          migrated > 0
            ? `✅ Sandbox renewed! ${migrated} files migrated to a fresh workspace. You can keep working without interruption.`
            : '✅ Workspace extended! You can keep working without interruption.',
          'system'
        );
        updateStatus('Sandbox active', true);

      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Renewal failed';
        console.error('[onSandboxRenewRef] Renewal failed:', error);
        chatAddChatMessage(
          `⚠️ Sandbox renewal failed: ${msg}. Your current workspace will expire soon — please save your work to the cloud.`,
          'system'
        );
        // Fall back to old behavior: try to open saved project or create blank sandbox
        const projectId = uiActiveProjectId || uiCurrentSessionProjectId;
        if (projectId) {
          void cloudActionsOpenCloudProject(projectId).catch((e) => {
            const fallbackMsg = e instanceof Error ? e.message : 'Unknown error';
            chatAddChatMessage(`Auto-recovery also failed: ${fallbackMsg}. Please refresh the page.`, 'system');
          });
        }
      } finally {
        uiSetLoading(false);
        uiSetShowLoadingBackground(false);
      }
    };
  }, [
    pathname,
    sandboxDataForRef,
    cloud.projectOpeningBusy,
    sandboxIsLandingBoot,
    chatAddChatMessage,
    uiSetLoading,
    uiSetShowLoadingBackground,
    searchParams,
    router,
    sandboxSetSandboxData,
    sandboxIframeRef,
    sandboxActionsFetchSandboxFiles,
    updateStatus,
    uiActiveProjectId,
    uiCurrentSessionProjectId,
    cloudActionsOpenCloudProject,
  ]);

  // Auto-fetch cloud projects once on mount so the dropdown is always populated
  const hasAutoFetchedProjectsRef = useRef(false);
  useEffect(() => {
    if (!hasAutoFetchedProjectsRef.current) {
      hasAutoFetchedProjectsRef.current = true;
      void cloudActions.loadCloudProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Jotai Atoms ──
  const setSelectedComponentsPreview = useSetAtom(selectedComponentsPreviewAtom);
  const setVisualEditingSelectedComponent = useSetAtom(visualEditingSelectedComponentAtom);
  const setCurrentComponentCoordinates = useSetAtom(currentComponentCoordinatesAtom);
  const setPreviewIframeRefAtom = useSetAtom(previewIframeRefAtom);
  const setPendingVisualChanges = useSetAtom(pendingVisualChangesAtom);
  const visualEditingSelectedComponent = useAtomValue(visualEditingSelectedComponentAtom);
  const appendChatContextRequest = useAtomValue(appendChatContextRequestAtom);
  const previewChatDraftRequest = useAtomValue(previewChatDraftRequestAtom);

  // ── Auto-send visual-editing component card prompts ──
  useEffect(() => {
    if (!previewChatDraftRequest?.fullDraft) return;
    void sendChatMessageRef.current?.({
      visible: 'Editing component...',
      llm: previewChatDraftRequest.fullDraft,
    });
  }, [previewChatDraftRequest]);

  // ── Preview Actions ──
  const previewActions = usePreviewActions({
    sandboxData: sandbox.sandboxData,
    previewError: sandbox.previewError,
    setPreviewError: sandbox.setPreviewError,
    previewHealthIssue: sandbox.previewHealthIssue,
    setPreviewHealthIssue: sandbox.setPreviewHealthIssue,
    addChatMessage: chat.addChatMessage,
    sendChatMessageRef,
    forceNextMessageAsEditRef,
    setActiveTab: files.setActiveTab,
    installPackages,
    reloadPreview: sandboxActions.reloadPreview,
    latestPreviewErrorRef: sandbox.latestPreviewErrorRef,
    lastPreviewErrorTextRef: sandbox.lastPreviewErrorTextRef,
    lastPreviewErrorAtRef: sandbox.lastPreviewErrorAtRef,
    visualSelectMode: sandbox.visualSelectMode,
    visualEditingSelectedComponent,
    iframeRef: sandbox.iframeRef,
    latestSandboxDataRef: sandbox.latestSandboxDataRef,
    visualEditingSelectedRef,
    setPreviewIframeRefAtom,
    setSelectedComponentsPreview,
    setVisualEditingSelectedComponent,
    setCurrentComponentCoordinates,
    setPendingVisualChanges,
    addChatMessageRef,
    lastPreviewReadyAtRef: sandbox.lastPreviewReadyAtRef,
    lastPreviewIframeLoadAtRef: sandbox.lastPreviewIframeLoadAtRef,
  });

  // ── Integrations ──
  const integrations = useIntegrations({
    sandboxData: sandbox.sandboxData,
    conversationContext: chat.conversationContext,
    setIsDownloadingZip: ui.setIsDownloadingZip,
    setZipNotice: ui.setZipNotice as (v: { status: string; message: string } | null) => void,
    setVercelDeployCard: ui.setVercelDeployCard,
    lastGithubRepoUrl: ui.lastGithubRepoUrl,
    setLastGithubRepoUrl: ui.setLastGithubRepoUrl,
    setProjectNameSuggestion: ui.setProjectNameSuggestion,
    setSiteTitleSuggestion: ui.setSiteTitleSuggestion,
    setPendingNamedAction: ui.setPendingNamedAction,
    setProjectNameDialogOpen: ui.setProjectNameDialogOpen,
    setProjectNameConfirming: ui.setProjectNameConfirming,
    setGithubPushDialogOpen: ui.setGithubPushDialogOpen,
    setGithubPushResult: ui.setGithubPushResult,
    setVercelDeployDialogOpen: ui.setVercelDeployDialogOpen,
    setVercelDeployResult: ui.setVercelDeployResult,
    setIntegrationBusy: ui.setIntegrationBusy,
    currentSessionProjectId: ui.currentSessionProjectId,
    setConversationContext: chat.setConversationContext,
    zipNoticeTimerRef,
    integrationBlockedSinceRef,
    lastIntegrationDeadlockAlertAtRef,
    log,
    addChatMessage: chat.addChatMessage,
    suggestProjectName: cloudActions.suggestProjectName,
    requestAutoRestorePreferredProject: cloudActions.requestAutoRestorePreferredProject,
    createSandbox: sandboxActions.createSandbox,
    applyGeneratedCode: async (code, isEdit, overrideSandboxData) => {
      await applyGeneratedCodeRef.current(code, isEdit, overrideSandboxData);
    },
    persistProjectDurably: cloudActions.persistProjectDurably,
    integrationReadiness: cloudActions.integrationReadiness,
    pendingNamedAction: ui.pendingNamedAction,
  });

  // ── Apply Generated Code ──
  const applyGeneratedCode = useApplyGeneratedCode({
    sandboxData: sandbox.sandboxData,
    chatMessages: chat.chatMessages,
    conversationContext: chat.conversationContext,
    addChatMessage: chat.addChatMessage,
    setConversationContext: chat.setConversationContext,
    applyPipelineStateRef: gen.applyPipelineStateRef,
    transitionApplyPipelineState: gen.transitionApplyPipelineState,
    setCodeApplicationState: gen.setCodeApplicationState,
    setGenerationProgress: gen.setGenerationProgress,
    iframeRef: sandbox.iframeRef,
    latestSandboxDataRef: sandbox.latestSandboxDataRef,
    latestPreviewErrorRef: sandbox.latestPreviewErrorRef,
    setLoading: ui.setLoading,
    setHasSavedGeneratedProject: () => {},
    setPreviewHealthIssue: sandbox.setPreviewHealthIssue,
    setActiveTab: files.setActiveTab,
    waitForPreviewHealthy: preview.waitForPreviewHealthy,
    probePreviewHealth: preview.probePreviewHealth,
    fetchSandboxFiles: sandboxActions.fetchSandboxFiles,
    ensureProjectNameForAction: integrations.ensureProjectNameForAction,
    persistProjectDurably: cloudActions.persistProjectDurably,
    attachE2bSandbox: sandboxActions.attachE2bSandbox,
    requestAutoRestorePreferredProject: cloudActions.requestAutoRestorePreferredProject,
    createSandbox: sandboxActions.createSandbox,
    submitPreviewErrorForFixRef: previewActions.submitPreviewErrorForFixRef,
    submitPreviewHealthForFixRef: previewActions.submitPreviewHealthForFixRef,
    log,
    displayStructure,
  });

  // Wire circular ref after applyGeneratedCode is created
  useEffect(() => {
    applyGeneratedCodeRef.current = applyGeneratedCode;
  }, [applyGeneratedCode]);

  // ── Send Chat Message ──
  const { sendChatMessage, abortChatMessage } = useAgentChatMessage({
    aiEnabled: true,
    ensureAiWebsiteApiKey,
    aiWebsiteKeySite: AI_WEBSITE_API_KEY_SITE_URL,
    sandboxData: sandbox.sandboxData,
    setSandboxData: sandbox.setSandboxData,
    sandboxDataRef: sandbox.sandboxDataRef,
    createSandbox: sandboxActions.createSandbox,
    aiChatInput: chat.aiChatInput,
    chatMessages: chat.chatMessages,
    addChatMessage: chat.addChatMessage,
    setChatMessages: chat.setChatMessages,
    setAiChatInput: chat.setAiChatInput,
    conversationContext: chat.conversationContext,
    setConversationContext: chat.setConversationContext,
    promptInput: chat.promptInput,
    setPromptInput: chat.setPromptInput,
    setGenerationTaskStartedAtMs: gen.setGenerationTaskStartedAtMs,
    setGenerationProgress: gen.setGenerationProgress,
    structureContent: files.structureContent,
    setActiveTab: files.setActiveTab,
    setQuotaErrorText: ui.setQuotaErrorText,
    setShowQuotaDialog: ui.setShowQuotaDialog,
    setApiKeyError: ui.setApiKeyError,
    setShowApiKeyDialog: ui.setShowApiKeyDialog,
    forceNextMessageAsEditRef,
    autoPreviewRepairInFlightRef: previewActions.autoPreviewRepairInFlightRef,
    iframeRef: sandbox.iframeRef,
    setIsLandingBoot: sandbox.setIsLandingBoot,
    projectId: ui.activeProjectId || undefined,
  });

  // Wire sendChatMessage ref after it's created
  useEffect(() => {
    sendChatMessageRef.current = sendChatMessage;
    abortChatMessageRef.current = abortChatMessage;
  }, [sendChatMessage, abortChatMessage]);

  // ── Track sandbox creation time for recovery guards ──
  useEffect(() => {
    if (sandbox.sandboxData?.sandboxId) {
      lastSandboxCreatedAtRef.current = Date.now();
    }
  }, [sandbox.sandboxData?.sandboxId]);

  // ── Recover file state after remount ──
  useEffect(() => {
    if (
      sandbox.sandboxData?.sandboxId &&
      Object.keys(sandboxFiles).length === 0 &&
      !sandboxCreationRef.current
    ) {
      void sandboxActionsFetchSandboxFiles(sandbox.sandboxData.sandboxId);
    }
  }, [sandbox.sandboxData?.sandboxId, sandboxFiles, sandboxCreationRef, sandboxActionsFetchSandboxFiles]);

  // ── Keep latestSnapshotRef in sync with workspace state ──
  // Split into two effects so chat message streaming doesn't re-copy file/project
  // state on every render, and vice-versa.
  useEffect(() => {
    latestSnapshotRef.current.sandboxId = sandbox.sandboxData?.sandboxId ?? null;
    latestSnapshotRef.current.projectId = ui.activeProjectId;
    latestSnapshotRef.current.projectName = chat.conversationContext.currentProject || '';
    latestSnapshotRef.current.fileStructure = files.fileStructure;
    latestSnapshotRef.current.structureContent = files.structureContent;
    latestSnapshotRef.current.sandboxFiles = files.sandboxFiles;
  }, [
    sandbox.sandboxData?.sandboxId,
    ui.activeProjectId,
    chat.conversationContext.currentProject,
    files.fileStructure,
    files.structureContent,
    files.sandboxFiles,
  ]);

  // ── Restore project metadata from ai-website.json when reconnecting ──
  // After a page refresh the sandbox files are fetched but conversationContext
  // starts empty, so push/deploy would re-show the "Name this project" dialog.
  // If ai-website.json exists, use it to recover the saved project name and title.
  useEffect(() => {
    if (chat.conversationContext.currentProject?.trim()) return;

    const aiWebsiteRaw = files.sandboxFiles?.['ai-website.json'];
    if (!aiWebsiteRaw) return;

    try {
      const aiWebsite = JSON.parse(aiWebsiteRaw) as {
        project?: { name?: string; siteTitle?: string };
      };
      const name = aiWebsite.project?.name?.trim();
      if (!name) return;

      chat.setConversationContext((prev) => ({
        ...prev,
        currentProject: name,
        siteTitle: aiWebsite.project?.siteTitle?.trim() || name,
      }));
    } catch {
      // ignore malformed ai-website.json
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- depend only on chat.setConversationContext; the full chat object changes on every streamed message and would re-run this effect constantly
  }, [files.sandboxFiles, chat.conversationContext.currentProject, chat.setConversationContext]);

  // Chat messages are appended (length increases) rather than mutated in place,
  // so depending on length avoids re-filtering/mapping the whole array on every
  // streaming update.
  useEffect(() => {
    latestSnapshotRef.current.chat = chat.chatMessages
      .filter((m) => m.type === 'user' || m.type === 'ai')
      .map((m) => ({
        content: m.content,
        type: m.type,
        timestamp: m.timestamp.getTime(),
        metadata: m.metadata as Record<string, unknown> | undefined,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.chatMessages.length]);

  // ── Background sandbox health check ──
  useEffect(() => {
    const sandboxId = sandbox.sandboxData?.sandboxId;
    if (!sandboxId) return;
    // Initial check after 5s, then every 30s
    const initialTimer = window.setTimeout(() => {
      if (document.hidden) return;
      const currentId = sandbox.latestSandboxDataRef.current?.sandboxId;
      if (currentId && currentId === sandboxId) {
        void sandboxActions.checkSandboxStatus();
      }
    }, 5000);
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      const currentId = sandbox.latestSandboxDataRef.current?.sandboxId;
      if (currentId && currentId === sandboxId) {
        void sandboxActions.checkSandboxStatus();
      }
    }, 30000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandbox.sandboxData?.sandboxId]);

  // ── Proactive sandbox renewal (migrate before E2B 1h TTL hits) ──
  useEffect(() => {
    const sandboxId = sandbox.sandboxData?.sandboxId;
    const endAtStr = sandbox.sandboxData?.endAt;
    const createdAtStr = sandbox.sandboxData?.createdAt;
    if (!sandboxId) return;

    if (!endAtStr && !createdAtStr) return;

    const RENEWAL_WINDOW_MS = 10 * 60 * 1000;
    const CHECK_INTERVAL_MS = 30 * 1000;
    let hasRenewed = false;
    let hasWarned = false;

    const interval = window.setInterval(async () => {
      if (document.hidden) return;
      if (hasRenewed) return;

      const current = sandbox.latestSandboxDataRef.current;
      if (!current?.sandboxId || current.sandboxId !== sandboxId) return;

      const currentEndAt = current.endAt;
      const currentCreatedAt = current.createdAt;
      let currentExpiresAt: number;
      if (currentEndAt) {
        currentExpiresAt = new Date(currentEndAt).getTime();
      } else if (currentCreatedAt) {
        currentExpiresAt = new Date(currentCreatedAt).getTime() + appConfig.e2b.timeoutMs;
      } else {
        return;
      }

      const remaining = currentExpiresAt - Date.now();

      // Heads-up warning at 15 minutes so the user knows migration is coming
      if (!hasWarned && remaining <= 15 * 60 * 1000 && remaining > RENEWAL_WINDOW_MS) {
        hasWarned = true;
        chat.addChatMessage(
          `Workspace expires in ${Math.round(remaining / 60000)} minutes. ` +
          `It will be extended automatically before then.`,
          'system'
        );
      }

      if (remaining > RENEWAL_WINDOW_MS) return;

      hasRenewed = true;

      // Renewal is transparent to running work: the backend extends the
      // sandbox TTL in place whenever possible, so an active generation no
      // longer needs to be aborted for a migration.
      await onSandboxRenewRef.current?.();
    }, CHECK_INTERVAL_MS);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandbox.sandboxData?.sandboxId]);

  // ── Catch-up renewal when the tab becomes visible again ──
  // Browsers throttle setInterval while the tab is hidden, so the proactive
  // renewal above may miss the window if the user is away. Run an immediate
  // check when the tab is shown again.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) return;

      const current = sandbox.latestSandboxDataRef.current;
      if (!current?.sandboxId) return;
      if (renewedSandboxIdRef.current === current.sandboxId) return;
      if (recoveredSandboxIdRef.current === current.sandboxId) return;

      const expiresAt = current.endAt
        ? new Date(current.endAt).getTime()
        : current.createdAt
          ? new Date(current.createdAt).getTime() + appConfig.e2b.timeoutMs
          : 0;

      if (!expiresAt) return;

      const RENEWAL_WINDOW_MS = 10 * 60 * 1000;
      if (expiresAt - Date.now() <= RENEWAL_WINDOW_MS) {
        void onSandboxRenewRef.current?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Review max reached handlers ──
  const handleContinueFixing = useCallback(() => {
    const issues = gen.generationProgress.reviewMaxIssues || [];
    if (issues.length === 0) return;
    // Resume the review loop with the issues (and any reviewer-created todos)
    // so the backend resets its retry counter and continues executor→reviewer
    // cycles instead of restarting the full analyzer/planner flow.
    void sendChatMessageRef.current?.({
      visible: 'Continuing to fix review issues...',
      llm:
        `The code review still found these issues after multiple attempts:\n` +
        issues.map((i) => `- ${i}`).join('\n') +
        `\n\nPlease fix all remaining issues comprehensively. Read the full codebase first, then apply all fixes.`,
      resumeReview: {
        issues,
        todos: gen.generationProgress.reviewMaxTodos,
      },
    });
    // Clear the max-reached flag so the card disappears while the new workflow runs
    genSetGenerationProgress((prev) => ({
      ...prev,
      reviewMaxReached: false,
      reviewMaxIssues: [],
      reviewMaxTodos: [],
    }));
  }, [gen.generationProgress.reviewMaxIssues, gen.generationProgress.reviewMaxTodos, genSetGenerationProgress]);

  const handleStopAndRender = useCallback(() => {
    // Clear the max-reached flag and switch to preview
    genSetGenerationProgress((prev) => ({
      ...prev,
      reviewMaxReached: false,
      reviewMaxIssues: [],
      reviewMaxTodos: [],
    }));
    filesSetActiveTab('preview');
    void sandboxActionsReloadPreview();
  }, [genSetGenerationProgress, filesSetActiveTab, sandboxActionsReloadPreview]);

  // ── Derived / Computed ──
  const hasFiles = gen.generationProgress.files.length > 0;
  // Workspace is "loading" until we have a sandbox, files are loaded, and any
  // boot/open/reload flow is complete.
  const isWorkspaceLoading =
    ui.loading &&
    !gen.generationProgress.isGenerating &&
    (!sandbox.sandboxData || sandbox.isLandingBoot || cloud.projectOpeningBusy || ui.isReloadingWorkspace || (sandbox.sandboxData && !hasFiles));

  return {
    router,
    searchParams,
    sandbox,
    ui,
    gen,
    chat,
    preview,
    files,
    cloud,
    sandboxActions,
    cloudActions,
    previewActions,
    integrations,
    sendChatMessage,
    abortChatMessage,
    applyGeneratedCode,
    ensureAiWebsiteApiKey,
    saveAiWebsiteApiKey,
    isWorkspaceLoading,
    // Cloud restore refs (wired to useSandboxInitialization)
    lastSavedProjectIdRef,
    openCloudProjectRef,
    autoRestorePreferredProjectRef,
    // Jotai
    setSelectedComponentsPreview,
    setVisualEditingSelectedComponent,
    setCurrentComponentCoordinates,
    setPreviewIframeRefAtom,
    setPendingVisualChanges,
    visualEditingSelectedComponent,
    appendChatContextRequest,
    previewChatDraftRequest,
    // Review max reached handlers
    handleContinueFixing,
    handleStopAndRender,
    // Extra refs for page-level wiring if needed
  };
}
