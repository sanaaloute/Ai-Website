"use client";

import { memo } from "react";
import { AppLoaderFullscreen, useAutoProgress } from "@/components/shared/AppLoader";
import type { SandboxData } from "@/hooks/useWorkspaceSandbox";
import type { GenerationProgress } from "@/hooks/useGenerationProgress";

export interface LoadingStatesWorkspace {
  projectOpeningBusy: boolean;
  projectOpeningStatus: string | null;
  isReloadingWorkspace: boolean;
  isLandingBoot: boolean;
  sandboxData: SandboxData | null;
  loading: boolean;
  generationProgress: GenerationProgress;
}

function GenerationLoadingStatesComponent({
  workspace,
}: {
  workspace: LoadingStatesWorkspace;
}) {
  const {
    projectOpeningBusy,
    projectOpeningStatus,
    isReloadingWorkspace,
    isLandingBoot,
    sandboxData,
    loading,
    generationProgress,
  } = workspace;

  const hasFiles = generationProgress.files.length > 0;

  // Auto-progress for single-step loaders
  const reloadProgress = useAutoProgress({
    enabled: isReloadingWorkspace,
    intervalMs: 600,
    step: 1.2,
  });
  const createProgress = useAutoProgress({
    enabled: loading && !sandboxData,
    intervalMs: 500,
    step: 1,
  });
  const fileLoadProgress = useAutoProgress({
    enabled: !!sandboxData && !hasFiles,
    intervalMs: 400,
    step: 2,
  });

  // ------------------------------------------------------------------
  // Reloading workspace — single step
  // ------------------------------------------------------------------
  if (isReloadingWorkspace) {
    return (
      <AppLoaderFullscreen
        title="Reloading workspace"
        steps={[{ label: "Restoring session", key: "restore" }]}
        activeStep={0}
        progress={reloadProgress}
      />
    );
  }

  // ------------------------------------------------------------------
  // Opening an existing cloud project — real status strings drive steps
  // ------------------------------------------------------------------
  if (projectOpeningBusy) {
    const status = projectOpeningStatus || "";

    // Template clone flow
    if (status.includes("Cloning") || status.includes("clone")) {
      const steps = [
        { label: "Cloning repository", key: "clone" },
        { label: "Booting preview", key: "preview" },
      ];
      const activeStep =
        status.includes("Waiting") || status.includes("preview") ? 1 : 0;
      return (
        <AppLoaderFullscreen
          title="Loading template"
          steps={steps}
          activeStep={activeStep}
          progress={activeStep === 1 ? 75 : 30}
        />
      );
    }

    // Standard cloud project open flow
    const steps = [
      { label: "Preparing workspace", key: "prepare" },
      { label: "Creating sandbox", key: "sandbox" },
      { label: "Restoring files", key: "files" },
      { label: "Finalizing", key: "finalize" },
    ];
    const activeStep = status.includes("Preparing")
      ? 0
      : status.includes("Creating") || status.includes("sandbox")
        ? 1
        : status.includes("Restoring") || status.includes("files")
          ? 2
          : 3;
    return (
      <AppLoaderFullscreen
        title="Opening project"
        steps={steps}
        activeStep={activeStep}
        progress={
          activeStep === 3
            ? 95
            : activeStep === 2
              ? 70
              : activeStep === 1
                ? 40
                : 15
        }
      />
    );
  }

  // ------------------------------------------------------------------
  // Landing boot (new project from landing page)
  // States: 0=sandbox creating, 1=files loading, 2=ready
  // ------------------------------------------------------------------
  if (
    isLandingBoot &&
    !generationProgress.isThinking &&
    !generationProgress.isGenerating
  ) {
    const activeStep = !sandboxData ? 0 : !hasFiles ? 1 : 2;
    const steps = [
      { label: "Creating sandbox", key: "sandbox" },
      { label: "Loading workspace", key: "workspace" },
      { label: "Starting preview", key: "preview" },
    ];
    return (
      <AppLoaderFullscreen
        title="Preparing workspace"
        steps={steps}
        activeStep={activeStep}
        progress={activeStep === 2 ? 90 : activeStep === 1 ? fileLoadProgress : createProgress}
      />
    );
  }

  // ------------------------------------------------------------------
  // Creating a fresh workspace (not from landing) OR loading files after
  // landing boot / sandbox creation has finished.
  // States: 0=sandbox creating, 1=files loading, 2=ready
  // ------------------------------------------------------------------
  if (
    !isLandingBoot &&
    (loading || (sandboxData && !hasFiles)) &&
    !generationProgress.isThinking &&
    !generationProgress.isGenerating
  ) {
    const activeStep = !sandboxData ? 0 : !hasFiles ? 1 : 2;
    const steps = [
      { label: "Creating sandbox", key: "sandbox" },
      { label: "Loading workspace", key: "workspace" },
      { label: "Finalizing", key: "finalize" },
    ];
    return (
      <AppLoaderFullscreen
        title="Creating workspace"
        steps={steps}
        activeStep={activeStep}
        progress={activeStep === 2 ? 95 : activeStep === 1 ? fileLoadProgress : createProgress}
      />
    );
  }

  return null;
}

export const GenerationLoadingStates = memo(GenerationLoadingStatesComponent);
