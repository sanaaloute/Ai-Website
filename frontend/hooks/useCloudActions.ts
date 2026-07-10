import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import type { ChatMessage, ConversationContext } from '@/hooks/useWorkspaceChat';
import type { GenerationProgress, CodeApplicationState } from '@/hooks/useGenerationProgress';
import type { CloudProjectListItem } from '@/lib/generation/types';
import type { StoredChatMessageV1 } from '@/lib/generation/storedChatTypes';
import { useCloudProjectList } from './useCloudProjectList';
import { useCloudProjectOpen } from './useCloudProjectOpen';
import { useCloudPersistence } from './useCloudPersistence';
import { useProjectName } from './useProjectName';

export interface CloudActionsDeps {
  // State values
  currentSessionProjectId: string | null;
  selectedCloudProjectId: string;
  activeProjectId: string | null;
  cloudProjects: CloudProjectListItem[];
  sandboxData: SandboxData | null;
  loading: boolean;
  projectOpeningBusy: boolean;
  projectDeleteBusyId: string | null;
  projectRenameBusyId: string | null;
  isSavingProject: boolean;
  generationProgressIsGenerating: boolean;
  codeApplicationStateStage: CodeApplicationState['stage'];
  fileStructure: string;
  structureContent: string;
  sandboxFiles: Record<string, string>;
  chatMessages: ChatMessage[];
  conversationContextCurrentProject: string;
  conversationContextSiteTitle: string;

  // Setters / dispatchers
  setCloudProjectsLoading: (val: boolean) => void;
  setCloudProjectsError: (err: string | null) => void;
  setCloudProjects: React.Dispatch<React.SetStateAction<CloudProjectListItem[]>>;
  setCurrentSessionProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedCloudProjectId: React.Dispatch<React.SetStateAction<string>>;
  setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  setConversationContext: React.Dispatch<React.SetStateAction<ConversationContext>>;
  setIsSavingProject: (val: boolean) => void;
  setProjectDeleteBusyId: (id: string | null) => void;
  setProjectMenuOpen: (val: boolean) => void;
  setProjectOpeningBusy: (val: boolean) => void;
  setProjectOpeningStatus: (status: string) => void;
  setRenameProjectDialogOpen: (val: boolean) => void;
  setRenameProjectTarget: (project: CloudProjectListItem | null) => void;
  setProjectRenameBusyId: (id: string | null) => void;
  renameProjectTarget: CloudProjectListItem | null;
  setFileStructure: React.Dispatch<React.SetStateAction<string>>;
  setStructureContent: React.Dispatch<React.SetStateAction<string>>;
  setSandboxFiles: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSandboxData: (data: SandboxData | null) => void;
  setGenerationProgress: React.Dispatch<React.SetStateAction<GenerationProgress>>;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setPreviewError: (err: string | null) => void;
  setPreviewHealthIssue: (issue: string | null) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<'preview' | 'generation'>>;

  // Refs
  cloudProjectsRequestSeqRef: React.MutableRefObject<number>;
  lastKnownCloudProjectsRef: React.MutableRefObject<CloudProjectListItem[]>;
  preserveCloudProjectsUntilRef: React.MutableRefObject<number>;
  latestSnapshotRef: React.MutableRefObject<{
    sandboxId: string | null;
    projectId: string | null;
    projectName: string;
    fileStructure: string;
    structureContent: string;
    sandboxFiles: Record<string, string>;
    chat: StoredChatMessageV1[];
  }>;
  lastSavedProjectIdRef: React.MutableRefObject<string | null>;
  autoRestorePreferredProjectRef: React.MutableRefObject<boolean>;
  pendingAutoOpenProjectIdRef: React.MutableRefObject<string | null>;
  openCloudProjectRef: React.MutableRefObject<(projectId: string) => Promise<void>>;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  latestSandboxDataRef: React.RefObject<SandboxData | null>;
  latestPreviewErrorRef: React.MutableRefObject<string | null>;
  lastPreviewErrorTextRef: React.MutableRefObject<string>;
  lastPreviewErrorAtRef: React.MutableRefObject<number>;

  // Router / search
  searchParams: URLSearchParams;
  router: {
    replace: (url: string, options?: { scroll?: boolean }) => void;
  };

  // Actions / callbacks
  createSandbox: (
    options?: boolean | {
      fromHomeScreen?: boolean;
      skipInitialFileFetch?: boolean;
      preserveProjectContext?: boolean;
      preserveCloudSelectionId?: string;
    }
  ) => Promise<SandboxData | null>;
  fetchSandboxFiles: (
    sandboxIdOverride?: string,
    options?: { suppressRecoveryMessage?: boolean }
  ) => Promise<void>;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
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

  // Constants
  LAST_SAVED_PROJECT_KEY: string;
  setLastGitccRepoUrl: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useCloudActions(deps: CloudActionsDeps) {
  const {
    currentSessionProjectId,
    selectedCloudProjectId,
    activeProjectId,
    cloudProjects,
    sandboxData,
    loading,
    projectOpeningBusy,
    projectDeleteBusyId,
    projectRenameBusyId,
    isSavingProject,
    generationProgressIsGenerating,
    codeApplicationStateStage,
    fileStructure,
    structureContent,
    sandboxFiles,
    chatMessages,
    conversationContextCurrentProject,
    conversationContextSiteTitle,
    setCloudProjectsLoading,
    setCloudProjectsError,
    setCloudProjects,
    setCurrentSessionProjectId,
    setSelectedCloudProjectId,
    setActiveProjectId,
    setConversationContext,
    setIsSavingProject,
    setProjectDeleteBusyId,
    setProjectMenuOpen,
    setProjectOpeningBusy,
    setProjectOpeningStatus,
    setRenameProjectDialogOpen,
    setRenameProjectTarget,
    renameProjectTarget,
    setProjectRenameBusyId,
    setFileStructure,
    setStructureContent,
    setSandboxFiles,
    setSandboxData,
    setGenerationProgress,
    setChatMessages,
    setPreviewError,
    setPreviewHealthIssue,
    setActiveTab,
    cloudProjectsRequestSeqRef,
    lastKnownCloudProjectsRef,
    preserveCloudProjectsUntilRef,
    latestSnapshotRef,
    lastSavedProjectIdRef,
    autoRestorePreferredProjectRef,
    pendingAutoOpenProjectIdRef,
    openCloudProjectRef,
    iframeRef,
    latestSandboxDataRef,
    latestPreviewErrorRef,
    lastPreviewErrorTextRef,
    lastPreviewErrorAtRef,
    searchParams,
    router,
    createSandbox,
    fetchSandboxFiles,
    addChatMessage,
    waitForPreviewHealthy,
    probePreviewHealth,
    LAST_SAVED_PROJECT_KEY,
    setLastGitccRepoUrl,
  } = deps;

  const cloudProjectList = useCloudProjectList({
    currentSessionProjectId,
    selectedCloudProjectId,
    activeProjectId,
    cloudProjects,
    projectOpeningBusy,
    projectDeleteBusyId,
    projectRenameBusyId,
    setCloudProjectsLoading,
    setCloudProjectsError,
    setCloudProjects,
    setCurrentSessionProjectId,
    setSelectedCloudProjectId,
    setActiveProjectId,
    setProjectDeleteBusyId,
    setProjectMenuOpen,
    setRenameProjectDialogOpen,
    setRenameProjectTarget,
    renameProjectTarget,
    setProjectRenameBusyId,
    setConversationContext,
    addChatMessage,
    cloudProjectsRequestSeqRef,
    lastKnownCloudProjectsRef,
    preserveCloudProjectsUntilRef,
    lastSavedProjectIdRef,
    pendingAutoOpenProjectIdRef,
    setLastGitccRepoUrl,
  });

  const projectName = useProjectName({
    searchParams,
    lastSavedProjectIdRef,
    activeProjectId,
    currentSessionProjectId,
    selectedCloudProjectId,
    cloudProjects,
    pendingAutoOpenProjectIdRef,
    autoRestorePreferredProjectRef,
    conversationContextCurrentProject,
    sandboxFiles,
    sandboxData,
    projectOpeningBusy,
    loading,
    generationProgressIsGenerating,
    codeApplicationStateStage,
    fileStructure,
    structureContent,
    chatMessages,
  });

  const cloudPersistence = useCloudPersistence({
    latestSnapshotRef,
    sandboxData,
    isSavingProject,
    activeProjectId,
    conversationContextCurrentProject,
    conversationContextSiteTitle,
    addChatMessage,
    setIsSavingProject,
    setActiveProjectId,
    setCurrentSessionProjectId,
    setSelectedCloudProjectId,
    setCloudProjects,
    setConversationContext,
    preserveCloudProjectsUntilRef,
    loadCloudProjects: cloudProjectList.loadCloudProjects,
    LAST_SAVED_PROJECT_KEY,
    lastSavedProjectIdRef,
    hasMeaningfulSnapshot: projectName.hasMeaningfulSnapshot,
  });

  const cloudProjectOpen = useCloudProjectOpen({
    projectOpeningBusy,
    sandboxData,
    searchParams,
    router,
    createSandbox,
    latestSandboxDataRef,
    setSandboxData,
    rememberLastSavedProjectId: cloudPersistence.rememberLastSavedProjectId,
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
    loadCloudProjects: cloudProjectList.loadCloudProjects,
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
    persistSnapshotToCloud: cloudPersistence.persistSnapshotToCloud,
    setLastGitccRepoUrl,
  });

  openCloudProjectRef.current = cloudProjectOpen.openCloudProject;

  return {
    loadCloudProjects: cloudProjectList.loadCloudProjects,
    rememberLastSavedProjectId: cloudPersistence.rememberLastSavedProjectId,
    resolvePreferredProjectId: projectName.resolvePreferredProjectId,
    queueAutoOpenPreferredProject: projectName.queueAutoOpenPreferredProject,
    requestAutoRestorePreferredProject: projectName.requestAutoRestorePreferredProject,
    hasMeaningfulSnapshot: projectName.hasMeaningfulSnapshot,
    inferProjectNameFromFiles: projectName.inferProjectNameFromFiles,
    suggestProjectName: projectName.suggestProjectName,
    integrationReadiness: projectName.integrationReadiness,
    persistSnapshotToCloud: cloudPersistence.persistSnapshotToCloud,
    persistProjectDurably: cloudPersistence.persistProjectDurably,
    deleteCloudProject: cloudProjectList.deleteCloudProject,
    openRenameProjectDialog: cloudProjectList.openRenameProjectDialog,
    submitProjectRename: cloudProjectList.submitProjectRename,
    openCloudProject: cloudProjectOpen.openCloudProject,
  };
}
