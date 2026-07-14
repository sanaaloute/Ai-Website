'use client';

import { Suspense, useCallback, useMemo, useRef } from 'react';
import { AppLoaderFullscreen } from '@/components/shared/AppLoader';
import { HeaderProvider } from '@/components/shared/header/HeaderContext';
import { GenerationLoadingStates } from '@/components/generation/GenerationLoadingStates';
import { GenerationHeader } from '@/components/generation/GenerationHeader';
import GenerationChatSidebar from '@/components/generation/GenerationChatSidebar';
import { GenerationRightPanel } from '@/components/generation/GenerationRightPanel';
import GenerationDialogOverlays from '@/components/generation/GenerationDialogOverlays';
import { UpgradeDialog } from '@/components/shared/UpgradeDialog';
import { ResizableGenerationWorkspace } from '@/components/generation/ResizableGenerationWorkspace';
import { useGenerationPage } from '@/hooks/useGenerationPage';
import { useSandboxInitialization } from '@/hooks/useSandboxInitialization';

function AISandboxPage() {
  const page = useGenerationPage();

  // Destructure page values so useMemo dependency arrays compare primitives and
  // stable callbacks rather than the whole page object.
  const {
    router,
    searchParams,
    sandbox,
    ui,
    gen,
    chat,
    files,
    cloud,
    sandboxActions,
    cloudActions,
    previewActions,
    integrations,
    sendChatMessage,
    abortChatMessage,
    saveAiWebsiteApiKey,
    handleContinueFixing,
    handleStopAndRender,
    isWorkspaceLoading,
    lastSavedProjectIdRef,
    openCloudProjectRef,
    autoRestorePreferredProjectRef,
  } = page;

  // ── Sandbox Initialization ──
  useSandboxInitialization({
    searchParams,
    sandboxData: sandbox.sandboxData,
    setSandboxData: sandbox.setSandboxData,
    setLoading: ui.setLoading,
    setIsLandingBoot: sandbox.setIsLandingBoot,
    createSandbox: sandboxActions.createSandbox,
    attachE2bSandbox: sandboxActions.attachE2bSandbox,
    sendChatMessage,
    loadCloudProjects: cloudActions.loadCloudProjects,
    openCloudProjectRef,
    lastSavedProjectIdRef,
    autoRestorePreferredProjectRef,
    setProjectOpeningBusy: cloud.setProjectOpeningBusy,
    setProjectOpeningStatus: ui.setProjectOpeningStatus,
    setIsReloadingWorkspace: ui.setIsReloadingWorkspace,
    fetchSandboxFiles: sandboxActions.fetchSandboxFiles,
    waitForPreviewHealthy: page.preview.waitForPreviewHealthy,
    reloadPreview: sandboxActions.reloadPreview,
    addChatMessage: chat.addChatMessage,
    setTemplateCloneError: ui.setTemplateCloneError,
    router,
  });

  // Memoize each workspace slice so child components can bail out of re-renders
  // when unrelated state changes.
  const loadingWorkspace = useMemo(
    () => ({
      projectOpeningBusy: cloud.projectOpeningBusy,
      projectOpeningStatus: ui.projectOpeningStatus,
      isReloadingWorkspace: ui.isReloadingWorkspace,
      isLandingBoot: sandbox.isLandingBoot,
      sandboxData: sandbox.sandboxData,
      loading: ui.loading,
      generationProgress: gen.generationProgress,
    }),
    [
      cloud.projectOpeningBusy,
      ui.projectOpeningStatus,
      ui.isReloadingWorkspace,
      sandbox.isLandingBoot,
      sandbox.sandboxData,
      ui.loading,
      gen.generationProgress,
    ]
  );

  const { setTemplateCloneError } = ui;
  const generationChatInputRef = useRef<HTMLTextAreaElement>(null);
  const codeDisplayRef = useRef<HTMLDivElement>(null);
  const handleCloseTemplateCloneError = useCallback(() => {
    setTemplateCloneError(null);
    router.push('/');
  }, [setTemplateCloneError, router]);

  const headerWorkspace = useMemo(
    () => ({
      sandboxData: sandbox.sandboxData,
      router,
      searchParams,
      projectOpeningBusy: cloud.projectOpeningBusy,
      loadCloudProjects: cloudActions.loadCloudProjects,
      projectMenuOpen: ui.projectMenuOpen,
      setProjectMenuOpen: ui.setProjectMenuOpen,
      cloudProjectsLoading: cloud.cloudProjectsLoading,
      cloudProjectsError: cloud.cloudProjectsError,
      cloudProjects: cloud.cloudProjects,
      cloudProjectsFetched: cloud.cloudProjectsFetched,
      selectedCloudProjectId: ui.selectedCloudProjectId,
      setSelectedCloudProjectId: ui.setSelectedCloudProjectId,
      currentSessionProjectId: ui.currentSessionProjectId,
      projectRenameBusyId: cloud.projectRenameBusyId,
      projectDeleteBusyId: cloud.projectDeleteBusyId,
      openCloudProject: cloudActions.openCloudProject,
      openRenameProjectDialog: cloudActions.openRenameProjectDialog,
      deleteCloudProject: cloudActions.deleteCloudProject,
      ensureProjectNameForAction: integrations.ensureProjectNameForAction,
      persistProjectDurably: cloudActions.persistProjectDurably,
      isSavingProject: ui.isSavingProject,
      downloadZip: integrations.downloadZip,
      isDownloadingZip: ui.isDownloadingZip,
      openGithubPushDialog: integrations.openGithubPushDialog,
      integrationReadiness: cloudActions.integrationReadiness,
      integrationBusy: ui.integrationBusy,
      hostOnVercel: integrations.hostOnVercel,
    }),
    [
      sandbox.sandboxData,
      router,
      searchParams,
      cloud.projectOpeningBusy,
      cloudActions.loadCloudProjects,
      ui.projectMenuOpen,
      ui.setProjectMenuOpen,
      cloud.cloudProjectsLoading,
      cloud.cloudProjectsError,
      cloud.cloudProjects,
      cloud.cloudProjectsFetched,
      ui.selectedCloudProjectId,
      ui.setSelectedCloudProjectId,
      ui.currentSessionProjectId,
      cloud.projectRenameBusyId,
      cloud.projectDeleteBusyId,
      cloudActions.openCloudProject,
      cloudActions.openRenameProjectDialog,
      cloudActions.deleteCloudProject,
      integrations.ensureProjectNameForAction,
      cloudActions.persistProjectDurably,
      ui.isSavingProject,
      integrations.downloadZip,
      ui.isDownloadingZip,
      integrations.openGithubPushDialog,
      cloudActions.integrationReadiness,
      ui.integrationBusy,
      integrations.hostOnVercel,
    ]
  );

  const chatSidebarWorkspace = useMemo(
    () => ({
      conversationContext: chat.conversationContext,
      screenshotCollapsed: ui.screenshotCollapsed,
      setScreenshotCollapsed: ui.setScreenshotCollapsed,
      mainChatVisibleMessages: chat.mainChatVisibleMessages,
      chatMessagesRef: chat.chatMessagesRef,
      codeApplicationState: gen.codeApplicationState,
      generationProgress: gen.generationProgress,
      generationEstimatedPercent: gen.generationProgress.estimatedPercent,
      aiChatInput: chat.aiChatInput,
      setAiChatInput: chat.setAiChatInput,
      sendChatMessage,
      abortChatMessage,
      loading: ui.loading,
      generationChatInputRef,
    }),
    [
      chat.conversationContext,
      ui.screenshotCollapsed,
      ui.setScreenshotCollapsed,
      chat.mainChatVisibleMessages,
      chat.chatMessagesRef,
      gen.codeApplicationState,
      gen.generationProgress,
      chat.aiChatInput,
      chat.setAiChatInput,
      sendChatMessage,
      abortChatMessage,
      ui.loading,
    ]
  );

  const rightPanelWorkspace = useMemo(
    () => ({
      activeTab: files.activeTab,
      setActiveTab: files.setActiveTab,
      generationProgress: gen.generationProgress,
      visualSelectMode: sandbox.visualSelectMode,
      setVisualSelectMode: sandbox.setVisualSelectMode,
      sandboxData: sandbox.sandboxData,
      reloadPreview: sandboxActions.reloadPreview,
      codeApplicationState: gen.codeApplicationState,
      codeDisplayRef,
      expandedFolders: files.expandedFolders,
      setExpandedFolders: files.setExpandedFolders,
      fileStructure: files.fileStructure,
      generationEstimatedPercent: gen.generationProgress.estimatedPercent,
      handleFileClick: files.handleFileClick,
      handlePreviewIframeLoad: previewActions.handlePreviewIframeLoad,
      onPreviewIframeLoad: previewActions.handlePreviewIframeLoad,
      iframeRef: sandbox.iframeRef,
      isCapturingScreenshot: false,
      isPreparingDesign: false,
      isScreenshotLoaded: sandbox.isScreenshotLoaded,
      isStartingNewGeneration: false,
      loading: ui.loading,
      loadingStage: null,
      previewHealthIssue: sandbox.previewHealthIssue,
      previewError: sandbox.previewError,
      sandboxFiles: files.sandboxFiles,
      screenshotError: sandbox.screenshotError,
      selectedFile: files.selectedFile,
      setIsScreenshotLoaded: sandbox.setIsScreenshotLoaded,
      setPreviewHealthIssue: sandbox.setPreviewHealthIssue,
      setPreviewError: sandbox.setPreviewError,
      setSelectedFile: files.setSelectedFile,
      toggleFolder: files.toggleFolder,
      urlScreenshot: null,
      visualEditingSelectedComponent: page.visualEditingSelectedComponent,
      handleCopyPreviewError: previewActions.handleCopyPreviewError,
      handleFixPreviewError: previewActions.handleFixPreviewError,
      handleFixPreviewHealthIssue: previewActions.handleFixPreviewHealthIssue,
      reviewMaxReached: gen.generationProgress.reviewMaxReached,
      reviewMaxIssues: gen.generationProgress.reviewMaxIssues,
      onContinueFixing: handleContinueFixing,
      onStopAndRender: handleStopAndRender,
      renameSandboxFile: sandboxActions.renameSandboxFile,
      deleteSandboxFile: sandboxActions.deleteSandboxFile,
    }),
    [
      files.activeTab,
      files.setActiveTab,
      gen.generationProgress,
      gen.codeApplicationState,
      sandbox.visualSelectMode,
      sandbox.setVisualSelectMode,
      sandbox.sandboxData,
      sandboxActions.reloadPreview,
      files.expandedFolders,
      files.setExpandedFolders,
      files.fileStructure,
      files.handleFileClick,
      previewActions.handlePreviewIframeLoad,
      sandbox.iframeRef,
      sandbox.isScreenshotLoaded,
      ui.loading,
      sandbox.previewHealthIssue,
      sandbox.previewError,
      files.sandboxFiles,
      sandbox.screenshotError,
      files.selectedFile,
      sandbox.setIsScreenshotLoaded,
      sandbox.setPreviewHealthIssue,
      sandbox.setPreviewError,
      files.setSelectedFile,
      files.toggleFolder,
      page.visualEditingSelectedComponent,
      previewActions.handleCopyPreviewError,
      previewActions.handleFixPreviewError,
      previewActions.handleFixPreviewHealthIssue,
      handleContinueFixing,
      handleStopAndRender,
      sandboxActions.renameSandboxFile,
      sandboxActions.deleteSandboxFile,
    ]
  );

  const currentProjectVercelInfo = useMemo(() => {
    const current = cloud.cloudProjects.find(
      (p) => p.projectId === ui.currentSessionProjectId
    );
    return current
      ? {
          appUuid: current.vercelProjectId,
          domainUrl: current.vercelDomainUrl,
        }
      : null;
  }, [cloud.cloudProjects, ui.currentSessionProjectId]);

  const dialogOverlaysWorkspace = useMemo(
    () => ({
      showApiKeyDialog: ui.showApiKeyDialog,
      setShowApiKeyDialog: ui.setShowApiKeyDialog,
      apiKeyInput: ui.apiKeyInput,
      setApiKeyInput: ui.setApiKeyInput,
      apiKeyError: ui.apiKeyError,
      apiKeySaving: ui.apiKeySaving,
      saveAiWebsiteApiKey,
      showQuotaDialog: ui.showQuotaDialog,
      setShowQuotaDialog: ui.setShowQuotaDialog,
      quotaErrorText: ui.quotaErrorText,
      zipNotice: ui.zipNotice,
      databaseDialogOpen: ui.databaseDialogOpen,
      setDatabaseDialogOpen: ui.setDatabaseDialogOpen,
      conversationContext: chat.conversationContext,
      saveDatabaseConnection: integrations.saveDatabaseConnection,
      githubPushDialogOpen: ui.githubPushDialogOpen,
      setGithubPushDialogOpen: ui.setGithubPushDialogOpen,
      githubPushResult: ui.githubPushResult,
      setGithubPushResult: ui.setGithubPushResult,
      defaultGithubRepoName: integrations.defaultGithubRepoName,
      executeGithubPush: integrations.executeGithubPush,
      executeVercelDeploy: integrations.executeVercelDeploy,
      integrationBusy: ui.integrationBusy,
      vercelDeployDialogOpen: ui.vercelDeployDialogOpen,
      setVercelDeployDialogOpen: ui.setVercelDeployDialogOpen,
      vercelDeployResult: ui.vercelDeployResult,
      setVercelDeployResult: ui.setVercelDeployResult,
      vercelDeployCard: ui.vercelDeployCard,
      setVercelDeployCard: ui.setVercelDeployCard,
      currentSessionProjectId: ui.currentSessionProjectId,
      currentProjectVercelInfo,
      projectNameDialogOpen: ui.projectNameDialogOpen,
      setProjectNameDialogOpen: ui.setProjectNameDialogOpen,
      cancelProjectNameAndPendingAction: integrations.cancelProjectNameAndPendingAction,
      projectNameSuggestion: ui.projectNameSuggestion,
      siteTitleSuggestion: ui.siteTitleSuggestion,
      suggestProjectName: cloudActions.suggestProjectName,
      projectNameConfirming: ui.projectNameConfirming,
      confirmProjectNameAndContinue: integrations.confirmProjectNameAndContinue,
      renameProjectDialogOpen: ui.renameProjectDialogOpen,
      setRenameProjectDialogOpen: ui.setRenameProjectDialogOpen,
      renameProjectTarget: ui.renameProjectTarget,
      setRenameProjectTarget: ui.setRenameProjectTarget,
      submitProjectRename: cloudActions.submitProjectRename,
    }),
    [
      ui.showApiKeyDialog,
      ui.setShowApiKeyDialog,
      ui.apiKeyInput,
      ui.setApiKeyInput,
      ui.apiKeyError,
      ui.apiKeySaving,
      saveAiWebsiteApiKey,
      ui.showQuotaDialog,
      ui.setShowQuotaDialog,
      ui.quotaErrorText,
      ui.zipNotice,
      ui.databaseDialogOpen,
      ui.setDatabaseDialogOpen,
      chat.conversationContext,
      integrations.saveDatabaseConnection,
      ui.githubPushDialogOpen,
      ui.setGithubPushDialogOpen,
      ui.githubPushResult,
      ui.setGithubPushResult,
      integrations.defaultGithubRepoName,
      integrations.executeGithubPush,
      integrations.executeVercelDeploy,
      ui.integrationBusy,
      ui.vercelDeployDialogOpen,
      ui.setVercelDeployDialogOpen,
      ui.vercelDeployResult,
      ui.setVercelDeployResult,
      ui.vercelDeployCard,
      ui.setVercelDeployCard,
      ui.currentSessionProjectId,
      currentProjectVercelInfo,
      ui.projectNameDialogOpen,
      ui.setProjectNameDialogOpen,
      integrations.cancelProjectNameAndPendingAction,
      ui.projectNameSuggestion,
      ui.siteTitleSuggestion,
      cloudActions.suggestProjectName,
      ui.projectNameConfirming,
      integrations.confirmProjectNameAndContinue,
      ui.renameProjectDialogOpen,
      ui.setRenameProjectDialogOpen,
      ui.renameProjectTarget,
      ui.setRenameProjectTarget,
      cloudActions.submitProjectRename,
    ]
  );

  // ── Render Loading State ──
  if (isWorkspaceLoading) {
    return <GenerationLoadingStates workspace={loadingWorkspace} />;
  }

  return (
    <HeaderProvider>
      <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-background font-sans text-foreground">
        {ui.templateCloneError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
            <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-red-200">Template Clone Failed</h2>
              <p className="mt-2 text-sm text-red-300">{ui.templateCloneError.message}</p>
              <button
                type="button"
                onClick={handleCloseTemplateCloneError}
                className="mt-4 rounded-xl bg-gradient-to-r from-red-500 to-red-400 px-4 py-2 text-sm font-semibold text-white shadow-soft-glow transition hover:opacity-95"
              >
                Close & Return Home
              </button>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-40" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.15] mix-blend-overlay" aria-hidden />

        <GenerationHeader workspace={headerWorkspace} />

        <ResizableGenerationWorkspace
          renderChatSidebar={(width) => (
            <GenerationChatSidebar workspace={chatSidebarWorkspace} width={width} />
          )}
          rightPanel={<GenerationRightPanel workspace={rightPanelWorkspace} />}
        />

        <GenerationDialogOverlays workspace={dialogOverlaysWorkspace} />

        <UpgradeDialog />
      </div>
    </HeaderProvider>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <AppLoaderFullscreen
          title="Loading workspace"
          steps={[{ label: 'Preparing', key: 'prepare' }]}
          activeStep={0}
          progress={40}
        />
      }
    >
      <AISandboxPage />
    </Suspense>
  );
}
