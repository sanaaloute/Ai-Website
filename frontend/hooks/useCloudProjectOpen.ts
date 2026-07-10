import { useCallback } from 'react';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import type { ChatMessage, ConversationContext } from '@/hooks/useWorkspaceChat';
import type { GenerationProgress } from '@/hooks/useGenerationProgress';
import type { CloudProjectListItem } from '@/lib/generation/types';
import type { StoredChatMessageV1 } from '@/lib/generation/storedChatTypes';
import { mapSandboxFilesToGenerationFiles } from './useCloudPersistence';
import { getSandboxStatus, killSandbox, openProject } from '@/lib/api/client';
import { normalizeGitccRepoUrl } from '@/lib/gitcc';
import { replaceGenerationSearchParams } from '@/lib/generation/urlUtils';

export interface CloudProjectOpenDeps {
  projectOpeningBusy: boolean;
  sandboxData: SandboxData | null;
  searchParams: URLSearchParams;
  router: {
    replace: (url: string, options?: { scroll?: boolean }) => void;
  };
  createSandbox: (
    options?: boolean | {
      fromHomeScreen?: boolean;
      skipInitialFileFetch?: boolean;
      preserveProjectContext?: boolean;
      preserveCloudSelectionId?: string;
    }
  ) => Promise<SandboxData | null>;
  latestSandboxDataRef: React.RefObject<SandboxData | null>;
  setSandboxData: (data: SandboxData | null) => void;
  rememberLastSavedProjectId: (projectId: string | null) => void;
  setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentSessionProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  setConversationContext: React.Dispatch<React.SetStateAction<ConversationContext>>;
  setFileStructure: React.Dispatch<React.SetStateAction<string>>;
  setStructureContent: React.Dispatch<React.SetStateAction<string>>;
  setSandboxFiles: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setGenerationProgress: React.Dispatch<React.SetStateAction<GenerationProgress>>;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setSelectedCloudProjectId: React.Dispatch<React.SetStateAction<string>>;
  setCloudProjects: React.Dispatch<React.SetStateAction<CloudProjectListItem[]>>;
  loadCloudProjects: (opts?: { preserveOnTransientEmpty?: boolean; prioritizeProjectId?: string }) => Promise<void>;
  fetchSandboxFiles: (
    sandboxIdOverride?: string,
    options?: { suppressRecoveryMessage?: boolean }
  ) => Promise<void>;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  latestPreviewErrorRef: React.MutableRefObject<string | null>;
  lastPreviewErrorTextRef: React.MutableRefObject<string>;
  lastPreviewErrorAtRef: React.MutableRefObject<number>;
  setPreviewError: (err: string | null) => void;
  setPreviewHealthIssue: (issue: string | null) => void;
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
  setActiveTab: React.Dispatch<React.SetStateAction<'preview' | 'generation'>>;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
  setProjectMenuOpen: (val: boolean) => void;
  setProjectOpeningBusy: (val: boolean) => void;
  setProjectOpeningStatus: (status: string) => void;
  preserveCloudProjectsUntilRef: React.MutableRefObject<number>;
  persistSnapshotToCloud: (sandboxIdOverride?: string) => Promise<boolean>;
  setLastGitccRepoUrl: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useCloudProjectOpen(deps: CloudProjectOpenDeps) {
  const {
    projectOpeningBusy,
    sandboxData,
    searchParams,
    router,
    createSandbox,
    latestSandboxDataRef,
    setSandboxData,
    rememberLastSavedProjectId,
    setActiveProjectId,
    setCurrentSessionProjectId,
    setConversationContext,
    setFileStructure,
    setStructureContent,
    setSandboxFiles,
    setGenerationProgress,
    setChatMessages,
    setSelectedCloudProjectId,
    setCloudProjects,
    loadCloudProjects,
    fetchSandboxFiles,
    iframeRef,
    latestPreviewErrorRef,
    lastPreviewErrorTextRef,
    lastPreviewErrorAtRef,
    setPreviewError,
    setPreviewHealthIssue,
    waitForPreviewHealthy,
    probePreviewHealth,
    setActiveTab,
    addChatMessage,
    setProjectMenuOpen,
    setProjectOpeningBusy,
    setProjectOpeningStatus,
    preserveCloudProjectsUntilRef,
    persistSnapshotToCloud,
    setLastGitccRepoUrl,
  } = deps;

  const openCloudProject = useCallback(
    async (projectId: string) => {
      if (!projectId || projectOpeningBusy) return;

      try {
        setProjectMenuOpen(false);
        setProjectOpeningBusy(true);
        preserveCloudProjectsUntilRef.current = Date.now() + 12_000;
        setProjectOpeningStatus('Preparing workspace...');

        let targetSandboxId = sandboxData?.sandboxId || '';

        // Try to reuse the current sandbox if it's still alive
        if (targetSandboxId) {
          try {
            const status = await getSandboxStatus(targetSandboxId);
            if (!status.ok || !status.data?.active || !status.data?.healthy) {
              targetSandboxId = '';
            }
          } catch (e) {
            console.warn('[openCloudProject] Sandbox status check failed:', e);
            targetSandboxId = '';
          }
        }

        // Only kill + create if we don't have a reusable sandbox
        if (!targetSandboxId) {
          const sandboxIdToKill = sandboxData?.sandboxId;
          if (sandboxIdToKill) {
            await persistSnapshotToCloud(sandboxIdToKill);
            try {
              await killSandbox(sandboxIdToKill);
            } catch (e) {
              console.warn('[openCloudProject] kill-sandbox failed:', e);
            }
          }

          const cleanParams = new URLSearchParams(searchParams.toString());
          cleanParams.delete('sandbox');
          cleanParams.delete('new');
          cleanParams.delete('from');
          router.replace(
            `/generation${cleanParams.toString() ? `?${cleanParams.toString()}` : ''}`,
            { scroll: false }
          );

          setProjectOpeningStatus('Creating a clean sandbox...');
          const newSandbox = await createSandbox({
            fromHomeScreen: true,
            skipInitialFileFetch: true,
            preserveProjectContext: true,
            preserveCloudSelectionId: projectId,
          });
          targetSandboxId = (newSandbox as SandboxData | null)?.sandboxId || '';
          if (!targetSandboxId) {
            for (let i = 0; i < 20; i += 1) {
              const candidate = latestSandboxDataRef.current;
              if (candidate?.sandboxId) {
                targetSandboxId = candidate.sandboxId;
                break;
              }
              await new Promise((resolve) => window.setTimeout(resolve, 250));
            }
          }
          if (!targetSandboxId) {
            throw new Error('Could not create target sandbox.');
          }
        } else {
          // Reusing existing sandbox: still persist current state before restore
          if (sandboxData?.sandboxId) {
            await persistSnapshotToCloud(sandboxData.sandboxId);
          }
        }

        setProjectOpeningStatus('Restoring project files...');
        const result = await openProject(projectId, targetSandboxId);
        const json = (result.ok ? result.data : {}) as {
          success?: boolean;
          error?: string;
          restoredCount?: number;
          restoreSource?: string;
          sandboxData?: SandboxData;
          warnings?: string[];
          gitccRepoUrl?: string;
          snapshot?: {
            projectId?: string;
            projectName?: string;
            fileStructure?: string;
            structureContent?: string;
            sandboxFiles?: Record<string, string>;
            chat?: StoredChatMessageV1[];
            updatedAt?: number;
          };
        };
        if (!result.ok || !json.success || !json.snapshot) {
          throw new Error(json.error || 'Could not open project.');
        }
        const normalizedRepoUrl = normalizeGitccRepoUrl(json.gitccRepoUrl);
        if (normalizedRepoUrl) {
          setLastGitccRepoUrl(normalizedRepoUrl);
        }
        if (Array.isArray(json.warnings) && json.warnings.length > 0) {
          addChatMessage(
            `Restore diagnostics: ${json.warnings.filter(Boolean).join(' | ')}`,
            'system'
          );
        }
        if (typeof json.restoreSource === 'string' && json.restoreSource) {
          addChatMessage(`Restore source: ${json.restoreSource}.`, 'system');
        }

        const restoredSandboxData =
          (json.sandboxData?.sandboxId ? json.sandboxData : null) ||
          (latestSandboxDataRef.current?.sandboxId ? latestSandboxDataRef.current : null);
        if (restoredSandboxData) {
          setSandboxData(restoredSandboxData);
        }

        const snapshot = json.snapshot;
        if (typeof snapshot.projectId === 'string' && snapshot.projectId) {
          rememberLastSavedProjectId(snapshot.projectId);
          setActiveProjectId(snapshot.projectId);
          setCurrentSessionProjectId(snapshot.projectId);
        }
        const isUuid = (value: string): boolean =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

        let restoredProjectName = '';
        let restoredSiteTitle = '';
        if (snapshot.sandboxFiles?.['ai-website.json']) {
          try {
            const aiWebsite = JSON.parse(snapshot.sandboxFiles['ai-website.json']) as {
              project?: { name?: string; siteTitle?: string };
            };
            const aiWebsiteName = aiWebsite.project?.name?.trim() || '';
            if (aiWebsiteName && !isUuid(aiWebsiteName)) {
              restoredProjectName = aiWebsiteName;
            }
            const aiWebsiteSiteTitle = aiWebsite.project?.siteTitle?.trim() || '';
            if (aiWebsiteSiteTitle && !isUuid(aiWebsiteSiteTitle)) {
              restoredSiteTitle = aiWebsiteSiteTitle;
            }
          } catch {
            // ignore malformed ai-website.json
          }
        }
        if (!restoredProjectName && typeof snapshot.projectName === 'string') {
          const snapshotName = snapshot.projectName.trim();
          if (snapshotName && !isUuid(snapshotName)) {
            restoredProjectName = snapshotName;
          }
        }
        if (restoredProjectName) {
          setConversationContext((prev) => ({
            ...prev,
            currentProject: restoredProjectName,
            siteTitle: restoredSiteTitle || restoredProjectName,
          }));
        }
        if (snapshot.fileStructure) setFileStructure(snapshot.fileStructure);
        if (snapshot.structureContent) setStructureContent(snapshot.structureContent);
        if (snapshot.sandboxFiles) {
          setSandboxFiles(snapshot.sandboxFiles);
          setGenerationProgress((prev) => ({
            ...prev,
            files: mapSandboxFilesToGenerationFiles(snapshot.sandboxFiles || {}),
          }));
          // Show the Code/Explorer tab immediately so the user sees the restored
          // project files instead of an empty Preview pane.
          setActiveTab('generation');
        }
        if (Array.isArray(snapshot.chat) && snapshot.chat.length > 0) {
          setChatMessages(storedRowsToChatMessages(snapshot.chat));
        }

        setSelectedCloudProjectId(projectId);
        setCurrentSessionProjectId(snapshot.projectId || projectId);

        // Update the browser URL with the opened project and its sandbox.
        const effectiveProjectId = snapshot.projectId || projectId;
        const effectiveProjectName = restoredProjectName || snapshot.projectName || '';
        if (effectiveProjectId && targetSandboxId) {
          const newParams = new URLSearchParams(searchParams.toString());
          newParams.set('projectId', effectiveProjectId);
          if (effectiveProjectName) {
            newParams.set('projectName', effectiveProjectName);
          } else {
            newParams.delete('projectName');
          }
          newParams.set('sandbox', targetSandboxId);
          newParams.delete('new');
          newParams.delete('from');
          replaceGenerationSearchParams(newParams);
        }

        // Optimistically move the opened project to the top of the list
        setCloudProjects((prev) => {
          const openedProject = prev.find((p) => p.projectId === projectId);
          if (!openedProject) return prev;
          const others = prev.filter((p) => p.projectId !== projectId);
          return [{ ...openedProject, updatedAt: Date.now() }, ...others];
        });
        void loadCloudProjects({
          preserveOnTransientEmpty: true,
          prioritizeProjectId: snapshot.projectId || projectId,
        });
        setProjectOpeningStatus('Finalizing workspace...');
        // Always refresh files from the live sandbox to ensure the UI is in sync,
        // since the snapshot may be capped/truncated for large projects.
        await fetchSandboxFiles(targetSandboxId, { suppressRecoveryMessage: true });
        const restoredUrl =
          restoredSandboxData?.url ||
          latestSandboxDataRef.current?.url;
        if (iframeRef.current && restoredUrl) {
          iframeRef.current.src = `${restoredUrl}?t=${Date.now()}&restored=1`;
        }

        latestPreviewErrorRef.current = null;
        lastPreviewErrorTextRef.current = '';
        lastPreviewErrorAtRef.current = 0;
        setPreviewError(null);
        setPreviewHealthIssue(null);
        const previewHealthy = await waitForPreviewHealthy(18000);
        if (!previewHealthy) {
          let statusMessage = 'Preview did not become healthy after restoring project files.';
          const fallbackProbe = await probePreviewHealth('restore', 4500);
          if (fallbackProbe.reachable) {
            setPreviewHealthIssue(null);
            return;
          }
          try {
            const statusResult = await getSandboxStatus();
            const statusJson = (statusResult.ok ? statusResult.data : {}) as {
              active?: boolean;
              healthy?: boolean;
              sandboxData?: { sandboxId?: string } | null;
            };
            if (!statusJson.active) {
              statusMessage =
                'Preview sandbox is no longer active right after restore. Please retry open project.';
            } else if (!statusJson.healthy) {
              statusMessage =
                'Sandbox is active but preview server is not healthy after restore. Please try refresh or AI fix.';
            } else if (!statusJson.sandboxData?.sandboxId) {
              statusMessage =
                'Sandbox status is inconsistent after restore (missing sandbox id). Please retry open project.';
            }
          } catch {
            statusMessage =
              'Could not verify preview health after restore due to a status check error.';
          }

          const previewError = (latestPreviewErrorRef.current as string | null | undefined)?.trim();
          if (previewError) {
            statusMessage = previewError;
          }

          setActiveTab('preview');
          setPreviewHealthIssue(statusMessage);
          addChatMessage(`Project restored, but preview failed to boot: ${statusMessage}`, 'system');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not open project.';
        addChatMessage(`Failed to open project: ${message}`, 'system');
      } finally {
        setProjectOpeningBusy(false);
        setProjectOpeningStatus('Preparing workspace...');
        setProjectMenuOpen(false);
      }
    },
    [
      projectOpeningBusy,
      sandboxData?.sandboxId,
      searchParams,
      router,
      createSandbox,
      latestSandboxDataRef,
      setSandboxData,
      rememberLastSavedProjectId,
      setActiveProjectId,
      setCurrentSessionProjectId,
      setConversationContext,
      setFileStructure,
      setStructureContent,
      setSandboxFiles,
      setGenerationProgress,
      setChatMessages,
      setSelectedCloudProjectId,
      setCloudProjects,
      loadCloudProjects,
      fetchSandboxFiles,
      iframeRef,
      latestPreviewErrorRef,
      lastPreviewErrorTextRef,
      lastPreviewErrorAtRef,
      setPreviewError,
      setPreviewHealthIssue,
      waitForPreviewHealthy,
      probePreviewHealth,
      setActiveTab,
      addChatMessage,
      setProjectMenuOpen,
      setProjectOpeningBusy,
      setProjectOpeningStatus,
      preserveCloudProjectsUntilRef,
      persistSnapshotToCloud,
      setLastGitccRepoUrl,
    ]
  );

  return {
    openCloudProject,
  };
}

function storedRowsToChatMessages(rows: StoredChatMessageV1[]): ChatMessage[] {
  const CHAT_MESSAGE_TYPES: ChatMessage['type'][] = [
    'user',
    'ai',
    'system',
    'file-update',
    'command',
    'error',
  ];
  function isChatMessageType(t: string): t is ChatMessage['type'] {
    return (CHAT_MESSAGE_TYPES as string[]).includes(t);
  }
  return rows
    .filter((r) => r.type === 'user' || r.type === 'ai')
    .map((r) => ({
      content: r.content,
      type: isChatMessageType(r.type) ? r.type : 'system',
      timestamp: new Date(r.timestamp),
      metadata: r.metadata as ChatMessage['metadata'] | undefined,
    }));
}
