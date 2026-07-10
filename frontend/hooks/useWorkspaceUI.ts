import { useState, useEffect } from 'react';
import type { CloudProjectListItem } from './useCloudProjects';
import { CURRENT_SESSION_PROJECT_KEY } from '@/lib/generation/constants';

export interface WorkspaceUIState {
  // Loading & status
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  showLoadingBackground: boolean;
  setShowLoadingBackground: React.Dispatch<React.SetStateAction<boolean>>;
  status: { text: string; active: boolean };
  setStatus: React.Dispatch<React.SetStateAction<{ text: string; active: boolean }>>;

  // Project opening / workspace reload
  projectOpeningStatus: string;
  setProjectOpeningStatus: React.Dispatch<React.SetStateAction<string>>;
  projectMenuOpen: boolean;
  setProjectMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isReloadingWorkspace: boolean;
  setIsReloadingWorkspace: React.Dispatch<React.SetStateAction<boolean>>;
  // GitHub / OpenHost integration
  lastGitccRepoUrl: string | null;
  setLastGitccRepoUrl: React.Dispatch<React.SetStateAction<string | null>>;
  openHostDeployCard: {
    status: "deploying" | "success" | "failed";
    message: string;
    domainUrl?: string;
    projectName?: string;
    siteTitle?: string;
    appUuid?: string;
    deploymentStatus?: string;
    commitMessage?: string;
    isPolling?: boolean;
    pocketbaseUrl?: string;
    pocketbaseAdminUrl?: string;
  } | null;
  setOpenHostDeployCard: React.Dispatch<
    React.SetStateAction<{
      status: "deploying" | "success" | "failed";
      message: string;
      domainUrl?: string;
      projectName?: string;
      siteTitle?: string;
      appUuid?: string;
      deploymentStatus?: string;
      commitMessage?: string;
      isPolling?: boolean;
      pocketbaseUrl?: string;
      pocketbaseAdminUrl?: string;
    } | null>
  >;

  // Rename dialog
  renameProjectDialogOpen: boolean;
  setRenameProjectDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  renameProjectTarget: CloudProjectListItem | null;
  setRenameProjectTarget: React.Dispatch<React.SetStateAction<CloudProjectListItem | null>>;

  // Project selection
  selectedCloudProjectId: string;
  setSelectedCloudProjectId: React.Dispatch<React.SetStateAction<string>>;
  activeProjectId: string | null;
  setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  currentSessionProjectId: string | null;
  setCurrentSessionProjectId: React.Dispatch<React.SetStateAction<string | null>>;

  // API Key dialog
  showApiKeyDialog: boolean;
  setShowApiKeyDialog: React.Dispatch<React.SetStateAction<boolean>>;
  apiKeyInput: string;
  setApiKeyInput: React.Dispatch<React.SetStateAction<string>>;
  apiKeyError: string | null;
  setApiKeyError: React.Dispatch<React.SetStateAction<string | null>>;
  apiKeySaving: boolean;
  setApiKeySaving: React.Dispatch<React.SetStateAction<boolean>>;
  apiKeyReady: boolean;
  setApiKeyReady: React.Dispatch<React.SetStateAction<boolean>>;

  // Quota dialog
  showQuotaDialog: boolean;
  setShowQuotaDialog: React.Dispatch<React.SetStateAction<boolean>>;
  quotaErrorText: string | null;
  setQuotaErrorText: React.Dispatch<React.SetStateAction<string | null>>;

  // Integration dialogs
  databaseDialogOpen: boolean;
  setDatabaseDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  gitccPushDialogOpen: boolean;
  setGitccPushDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  gitccPushResult: { type: 'success' | 'error'; message: string } | null;
  setGitccPushResult: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error'; message: string } | null>>;
  openHostDeployDialogOpen: boolean;
  setOpenHostDeployDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openHostDeployResult: { type: 'success' | 'error'; message: string } | null;
  setOpenHostDeployResult: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error'; message: string } | null>>;
  projectNameDialogOpen: boolean;
  setProjectNameDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  projectNameSuggestion: string;
  setProjectNameSuggestion: React.Dispatch<React.SetStateAction<string>>;
  siteTitleSuggestion: string;
  setSiteTitleSuggestion: React.Dispatch<React.SetStateAction<string>>;
  projectNameConfirming: boolean;
  setProjectNameConfirming: React.Dispatch<React.SetStateAction<boolean>>;
  pendingNamedAction:
    | { kind: 'save'; saveReason: 'manual' | 'auto-generation-success' }
    | { kind: 'gitcc-open' }
    | { kind: 'openhost-deploy' }
    | null;
  setPendingNamedAction: React.Dispatch<
    React.SetStateAction<
      | { kind: 'save'; saveReason: 'manual' | 'auto-generation-success' }
      | { kind: 'gitcc-open' }
      | { kind: 'openhost-deploy' }
      | null
    >
  >;
  integrationBusy: 'gitcc' | 'openhost' | null;
  setIntegrationBusy: React.Dispatch<React.SetStateAction<'gitcc' | 'openhost' | null>>;

  // Download / Save
  isDownloadingZip: boolean;
  setIsDownloadingZip: React.Dispatch<React.SetStateAction<boolean>>;
  isSavingProject: boolean;
  setIsSavingProject: React.Dispatch<React.SetStateAction<boolean>>;

  // Response area (for command logs)
  responseArea: string[];
  setResponseArea: React.Dispatch<React.SetStateAction<string[]>>;

  // ZIP / Screenshot / Generation flags
  zipNotice: { status: 'preparing' | 'ready' | 'error'; message: string } | null;
  setZipNotice: React.Dispatch<React.SetStateAction<{ status: 'preparing' | 'ready' | 'error'; message: string } | null>>;
  loadingStage: 'gathering' | 'planning' | 'generating' | null;
  isStartingNewGeneration: boolean;
  isCapturingScreenshot: boolean;
  isPreparingDesign: boolean;
  urlScreenshot: string | null;
  screenshotCollapsed: boolean;
  setScreenshotCollapsed: React.Dispatch<React.SetStateAction<boolean>>;

  // Template clone error
  templateCloneError: { message: string } | null;
  setTemplateCloneError: React.Dispatch<React.SetStateAction<{ message: string } | null>>;
}

export interface UseWorkspaceUIOptions {
  initialLoading?: boolean;
}

export function useWorkspaceUI(options?: UseWorkspaceUIOptions): WorkspaceUIState {
  const [loading, setLoading] = useState(options?.initialLoading ?? false);
  const [showLoadingBackground, setShowLoadingBackground] = useState(false);
  const [status, setStatus] = useState({ text: 'Not connected', active: false });

  const [projectOpeningStatus, setProjectOpeningStatus] = useState('');
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [isReloadingWorkspace, setIsReloadingWorkspace] = useState(false);
  const [lastGitccRepoUrl, setLastGitccRepoUrl] = useState<string | null>(null);
  const [openHostDeployCard, setOpenHostDeployCard] = useState<{
    status: "deploying" | "success" | "failed";
    message: string;
    domainUrl?: string;
    projectName?: string;
    siteTitle?: string;
    appUuid?: string;
    deploymentStatus?: string;
    commitMessage?: string;
    isPolling?: boolean;
    pocketbaseUrl?: string;
    pocketbaseAdminUrl?: string;
  } | null>(null);

  const [renameProjectDialogOpen, setRenameProjectDialogOpen] = useState(false);
  const [renameProjectTarget, setRenameProjectTarget] = useState<CloudProjectListItem | null>(null);

  const [selectedCloudProjectId, setSelectedCloudProjectId] = useState(() => {
    try {
      return window.sessionStorage.getItem(CURRENT_SESSION_PROJECT_KEY) || '';
    } catch {
      return '';
    }
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentSessionProjectId, setCurrentSessionProjectId] = useState<string | null>(() => {
    try {
      return window.sessionStorage.getItem(CURRENT_SESSION_PROJECT_KEY) || null;
    } catch {
      return null;
    }
  });

  // Persist current session project ID to sessionStorage so it survives refresh
  useEffect(() => {
    try {
      if (currentSessionProjectId) {
        window.sessionStorage.setItem(CURRENT_SESSION_PROJECT_KEY, currentSessionProjectId);
      } else {
        window.sessionStorage.removeItem(CURRENT_SESSION_PROJECT_KEY);
      }
    } catch {
      // ignore
    }
  }, [currentSessionProjectId]);

  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeyReady, setApiKeyReady] = useState(false);

  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const [quotaErrorText, setQuotaErrorText] = useState<string | null>(null);

  const [databaseDialogOpen, setDatabaseDialogOpen] = useState(false);
  const [gitccPushDialogOpen, setGitccPushDialogOpen] = useState(false);
  const [gitccPushResult, setGitccPushResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [openHostDeployDialogOpen, setOpenHostDeployDialogOpen] = useState(false);
  const [openHostDeployResult, setOpenHostDeployResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [projectNameDialogOpen, setProjectNameDialogOpen] = useState(false);
  const [projectNameSuggestion, setProjectNameSuggestion] = useState('');
  const [siteTitleSuggestion, setSiteTitleSuggestion] = useState('');
  const [projectNameConfirming, setProjectNameConfirming] = useState(false);
  const [pendingNamedAction, setPendingNamedAction] = useState<
    | { kind: 'save'; saveReason: 'manual' | 'auto-generation-success' }
    | { kind: 'gitcc-open' }
    | { kind: 'openhost-deploy' }
    | null
  >(null);
  const [integrationBusy, setIntegrationBusy] = useState<'gitcc' | 'openhost' | null>(null);

  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);

  const [responseArea, setResponseArea] = useState<string[]>([]);

  const [zipNotice, setZipNotice] = useState<{ status: 'preparing' | 'ready' | 'error'; message: string } | null>(null);
  const [loadingStage] = useState<'gathering' | 'planning' | 'generating' | null>(null);
  const [isStartingNewGeneration] = useState(false);
  const [isCapturingScreenshot] = useState(false);
  const [isPreparingDesign] = useState(false);
  const [urlScreenshot] = useState<string | null>(null);
  const [screenshotCollapsed, setScreenshotCollapsed] = useState(false);

  const [templateCloneError, setTemplateCloneError] = useState<{ message: string } | null>(null);

  return {
    loading, setLoading,
    showLoadingBackground, setShowLoadingBackground,
    status, setStatus,
    projectOpeningStatus, setProjectOpeningStatus,
    projectMenuOpen, setProjectMenuOpen,
    isReloadingWorkspace, setIsReloadingWorkspace,
    lastGitccRepoUrl, setLastGitccRepoUrl,
    openHostDeployCard, setOpenHostDeployCard,
    renameProjectDialogOpen, setRenameProjectDialogOpen,
    renameProjectTarget, setRenameProjectTarget,
    selectedCloudProjectId, setSelectedCloudProjectId,
    activeProjectId, setActiveProjectId,
    currentSessionProjectId, setCurrentSessionProjectId,
    showApiKeyDialog, setShowApiKeyDialog,
    apiKeyInput, setApiKeyInput,
    apiKeyError, setApiKeyError,
    apiKeySaving, setApiKeySaving,
    apiKeyReady, setApiKeyReady,
    showQuotaDialog, setShowQuotaDialog,
    quotaErrorText, setQuotaErrorText,
    databaseDialogOpen, setDatabaseDialogOpen,
    gitccPushDialogOpen, setGitccPushDialogOpen,
    gitccPushResult, setGitccPushResult,
    openHostDeployDialogOpen, setOpenHostDeployDialogOpen,
    openHostDeployResult, setOpenHostDeployResult,
    projectNameDialogOpen, setProjectNameDialogOpen,
    projectNameSuggestion, setProjectNameSuggestion,
    siteTitleSuggestion, setSiteTitleSuggestion,
    projectNameConfirming, setProjectNameConfirming,
    pendingNamedAction, setPendingNamedAction,
    integrationBusy, setIntegrationBusy,
    isDownloadingZip, setIsDownloadingZip,
    isSavingProject, setIsSavingProject,
    responseArea, setResponseArea,
    zipNotice, setZipNotice,
    loadingStage,
    isStartingNewGeneration,
    isCapturingScreenshot,
    isPreparingDesign,
    urlScreenshot,
    screenshotCollapsed, setScreenshotCollapsed,
    templateCloneError, setTemplateCloneError,
  };
}
