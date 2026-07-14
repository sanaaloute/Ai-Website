import { useRef, useCallback, useEffect } from 'react';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import type { ChatMessage, ConversationContext } from '@/hooks/useWorkspaceChat';
import type { GenerationProgress } from '@/hooks/useGenerationProgress';
import { useSandboxStatus } from './useSandboxStatus';
import { useSandboxCreation } from './useSandboxCreation';
import { useSandboxFiles } from './useSandboxFiles';
import { deleteSandboxFile as apiDeleteSandboxFile, renameSandboxFile as apiRenameSandboxFile } from '@/lib/api/client';

export interface SandboxActionsDeps {
  // Sandbox state
  sandboxData: SandboxData | null;
  setSandboxData: (data: SandboxData | null) => void;

  // UI state / setters
  updateStatus: (text: string, active: boolean) => void;
  setLoading: (val: boolean) => void;
  setShowLoadingBackground: (val: boolean) => void;
  setResponseArea: (v: string[]) => void;
  setScreenshotError: (v: string | null) => void;
  setPreviewError: (v: string | null) => void;
  setPreviewHealthIssue: (v: string | null) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<'preview' | 'generation'>>;

  // Chat / conversation
  chatMessages: ChatMessage[];
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
  selectedFile: string | null;

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
  sandboxFileRecoverRef: React.MutableRefObject<boolean>;
  restoreSavedProjectOnceRef: React.MutableRefObject<boolean>;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  latestPreviewErrorRef: React.MutableRefObject<string | null>;
  lastPreviewErrorTextRef: React.MutableRefObject<string>;
  lastPreviewErrorAtRef: React.MutableRefObject<number>;
  onSandboxDeadRef?: React.MutableRefObject<(() => void) | undefined>;

  // Helpers / actions
  persistSnapshotToCloud: (sandboxId?: string) => Promise<boolean>;
  requestAutoRestorePreferredProject: (preferredProjectId?: string | null) => string | null;
  displayStructure: (structure: unknown) => void;
  log: (message: string, type?: 'info' | 'error' | 'command') => void;
  mapSandboxFilesToGenerationFiles: (filesMap: Record<string, string>) => Array<{
    path: string;
    content: string;
    type: string;
    completed: boolean;
    edited?: boolean;
  }>;

  // Input state used by createSandbox
  promptInput: string;
  setPromptInput: (v: string) => void;
}

export function useSandboxActions(deps: SandboxActionsDeps) {
  const {
    sandboxData,
    setSandboxData,
    updateStatus,
    setLoading,
    setShowLoadingBackground,
    setResponseArea,
    setScreenshotError,
    setPreviewError,
    setPreviewHealthIssue,
    setActiveTab,
    setChatMessages,
    conversationContext,
    setConversationContext,
    addChatMessage,
    setGenerationProgress,
    setSandboxFiles,
    setFileStructure,
    setStructureContent,
    setSelectedFile,
    selectedFile,
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
    sandboxFileRecoverRef,
    restoreSavedProjectOnceRef,
    iframeRef,
    latestPreviewErrorRef,
    lastPreviewErrorTextRef,
    lastPreviewErrorAtRef,
    onSandboxDeadRef,
    persistSnapshotToCloud,
    requestAutoRestorePreferredProject,
    displayStructure,
    log,
    mapSandboxFilesToGenerationFiles,
    promptInput,
    setPromptInput,
  } = deps;

  // Sandbox-related refs extracted from page.tsx
  const autoInstallInFlightRef = useRef(false);
  const missingPackageInstallAttemptsRef = useRef<Record<string, number>>({});
  const autoPreviewRepairInFlightRef = useRef(false);

  // Refs to break circular dependencies between createSandbox and fetchSandboxFiles
  const fetchSandboxFilesRef = useRef<
    ((sandboxIdOverride?: string, options?: { suppressRecoveryMessage?: boolean }) => Promise<void>) | undefined
  >();
  const createSandboxRef = useRef<
    ((options?:
      | boolean
      | {
          fromHomeScreen?: boolean;
          skipInitialFileFetch?: boolean;
          preserveProjectContext?: boolean;
          preserveCloudSelectionId?: string;
        }) => Promise<unknown>) | undefined
  >();
  const attachE2bSandboxRef = useRef<
    ((targetSandboxId: string, options?: { forceReconnect?: boolean }) => Promise<void>) | undefined
  >();

  const { checkSandboxStatus } = useSandboxStatus({
    sandboxData,
    setSandboxData,
    updateStatus,
    onSandboxDeadRef,
    latestSandboxDataRef,
  });

  const { createSandbox, loadE2bSandboxes, attachE2bSandbox } = useSandboxCreation({
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
  });

  const { fetchSandboxFiles, reloadPreview } = useSandboxFiles({
    sandboxData,
    sandboxFileRecoverRef,
    setSandboxFiles,
    setFileStructure,
    setGenerationProgress,
    addChatMessage,
    requestAutoRestorePreferredProject,
    mapSandboxFilesToGenerationFiles,
    createSandboxRef,
    latestPreviewErrorRef,
    lastPreviewErrorTextRef,
    lastPreviewErrorAtRef,
    setPreviewError,
    setPreviewHealthIssue,
    setActiveTab,
    iframeRef,
    searchParams,
    latestSandboxDataRef,
    attachE2bSandboxRef,
  });

  // Wire up circular refs after all callbacks are defined
  useEffect(() => {
    fetchSandboxFilesRef.current = fetchSandboxFiles;
    createSandboxRef.current = createSandbox;
    attachE2bSandboxRef.current = attachE2bSandbox;
  });

  const renameSandboxFile = useCallback(
    async (oldPath: string, newName: string) => {
      const sandboxId = sandboxData?.sandboxId;
      if (!sandboxId) {
        addChatMessage('No active sandbox. Create or attach a sandbox first.', 'system');
        return;
      }

      const trimmed = newName.trim();
      if (!trimmed || trimmed.includes('/') || trimmed === oldPath.split('/').pop()) {
        return;
      }

      const parentPath = oldPath.split('/').slice(0, -1).join('/');
      const newPath = parentPath ? `${parentPath}/${trimmed}` : trimmed;

      try {
        const res = await apiRenameSandboxFile(sandboxId, oldPath, newPath);
        if (!res.ok) {
          throw new Error((res.error as { error?: string } | undefined)?.error || `Rename failed (${res.status})`);
        }

        if (selectedFile === oldPath) {
          setSelectedFile(newPath);
        } else if (selectedFile?.startsWith(`${oldPath}/`)) {
          setSelectedFile(`${newPath}${selectedFile.slice(oldPath.length)}`);
        }

        await fetchSandboxFiles();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        addChatMessage(`Rename failed: ${message}`, 'system');
      }
    },
    [sandboxData, selectedFile, setSelectedFile, fetchSandboxFiles, addChatMessage]
  );

  const deleteSandboxFile = useCallback(
    async (path: string) => {
      const sandboxId = sandboxData?.sandboxId;
      if (!sandboxId) {
        addChatMessage('No active sandbox. Create or attach a sandbox first.', 'system');
        return;
      }

      if (!window.confirm(`Delete “${path}”? This cannot be undone.`)) {
        return;
      }

      try {
        const res = await apiDeleteSandboxFile(sandboxId, path);
        if (!res.ok) {
          throw new Error((res.error as { error?: string } | undefined)?.error || `Delete failed (${res.status})`);
        }

        if (selectedFile === path || selectedFile?.startsWith(`${path}/`)) {
          setSelectedFile(null);
        }

        await fetchSandboxFiles();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        addChatMessage(`Delete failed: ${message}`, 'system');
      }
    },
    [sandboxData, selectedFile, setSelectedFile, fetchSandboxFiles, addChatMessage]
  );

  return {
    checkSandboxStatus,
    createSandbox,
    loadE2bSandboxes,
    attachE2bSandbox,
    reloadPreview,
    fetchSandboxFiles,
    renameSandboxFile,
    deleteSandboxFile,
    autoInstallInFlightRef,
    missingPackageInstallAttemptsRef,
    autoPreviewRepairInFlightRef,
  };
}
