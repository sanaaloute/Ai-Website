'use client';

import React, { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { GenerationCognitionLoader, GenerationPreviewWait } from '@/components/builder/GenerationCognitionLoader';
import { SandboxApplyOverlay } from '@/components/builder/GenerationCognitionLoader';
import { ComponentPreviewAskCard } from '@/components/visual-editing/ComponentPreviewAskCard';
import { VisualEditingToolbar } from '@/components/visual-editing/VisualEditingToolbar';
import type { CodeApplicationState, GenerationProgress } from '@/hooks/useGenerationProgress';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';

export interface GenerationPreviewPanelProps {
  sandboxData: SandboxData | null;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  onPreviewIframeLoad: () => void;
  // Loading states
  isCapturingScreenshot: boolean;
  isPreparingDesign: boolean;
  isStartingNewGeneration: boolean;
  loading: boolean;
  loadingStage: string | null;
  // Screenshot
  urlScreenshot: string | null;
  isScreenshotLoaded: boolean;
  setIsScreenshotLoaded: (v: boolean) => void;
  screenshotError: string | null;
  // Generation
  generationProgress: GenerationProgress;
  // Errors / health
  previewError: string | null;
  previewHealthIssue: string | null;
  setPreviewError: (v: string | null) => void;
  setPreviewHealthIssue: (v: string | null) => void;
  handleCopyPreviewError: () => void;
  handleFixPreviewError: () => void;
  handleFixPreviewHealthIssue: () => void;
  // Review max reached
  reviewMaxReached?: boolean;
  reviewMaxIssues?: string[];
  onContinueFixing?: () => void;
  onStopAndRender?: () => void;
  // Apply overlay
  codeApplicationState: CodeApplicationState;
  // Visual editing
  visualSelectMode: boolean;
  visualEditingSelectedComponent: { id: string; name: string; relativePath: string; lineNumber: number; columnNumber: number; runtimeId?: string } | null;
  sandboxFiles: Record<string, string>;
  fileStructure: string;
  // Actions
  reloadPreview: () => void;
}

function GenerationPreviewPanelComponent({
  sandboxData,
  iframeRef,
  onPreviewIframeLoad,
  isCapturingScreenshot,
  isPreparingDesign,
  isStartingNewGeneration,
  loading,
  loadingStage,
  urlScreenshot,
  isScreenshotLoaded,
  setIsScreenshotLoaded,
  screenshotError,
  generationProgress,
  previewError,
  previewHealthIssue,
  setPreviewError,
  setPreviewHealthIssue,
  handleCopyPreviewError,
  handleFixPreviewError,
  handleFixPreviewHealthIssue,
  codeApplicationState,
  visualSelectMode,
  visualEditingSelectedComponent,
  sandboxFiles,
  fileStructure,
  reloadPreview,
}: GenerationPreviewPanelProps) {
  const isInitialGeneration = !sandboxData?.url && (urlScreenshot || isCapturingScreenshot || isPreparingDesign || loadingStage);
  const isBuilding = generationProgress.isGenerating || (codeApplicationState.stage && codeApplicationState.stage !== 'complete');
  const hasBuiltContent = generationProgress.files.length > 0 || codeApplicationState.stage === 'complete';

  // Loading overlay state (no sandbox URL yet, capturing screenshot, etc.)
  if (isInitialGeneration) {
    const shouldShowLoadingOverlay =
      loading || generationProgress.isGenerating || isPreparingDesign || loadingStage || isCapturingScreenshot || isStartingNewGeneration;
    return (
      <div className="relative w-full h-full bg-zinc-950">
        {urlScreenshot && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={urlScreenshot}
            alt="Website preview"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{
              opacity: isScreenshotLoaded ? 1 : 0,
              willChange: 'opacity',
            }}
            onLoad={() => setIsScreenshotLoaded(true)}
            loading="eager"
          />
        )}

        {shouldShowLoadingOverlay && (
          <GenerationPreviewWait
            line1={
              isCapturingScreenshot
                ? 'Analyzing website…'
                : isPreparingDesign
                  ? 'Preparing design…'
                  : generationProgress.isGenerating
                    ? 'Generating your app…'
                    : 'Loading…'
            }
            line2={
              isCapturingScreenshot
                ? 'Capturing layout and visual structure'
                : isPreparingDesign
                  ? 'Understanding layout, typography, and sections'
                  : generationProgress.isGenerating
                    ? 'Streaming components into your live sandbox'
                    : 'Please wait'
            }
          />
        )}
      </div>
    );
  }

  // Building in progress (sandbox exists, generation or apply is active)
  if (sandboxData?.url && isBuilding) {
    return (
      <div className="relative w-full h-full bg-zinc-950">
        <GenerationPreviewWait
          line1="Building your website…"
          line2="Streaming code into your live sandbox — your preview will appear here when ready"
        />
      </div>
    );
  }

  // Placeholder: sandbox exists but no generated code applied yet
  if (sandboxData?.url && !hasBuiltContent) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950 px-6 text-center">
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] shadow-xl shadow-black/20">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-glow-cyan/70">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.388 1.62a15.998 15.998 0 0 0 1.622-3.395m0 0a15.998 15.998 0 0 1 3.388 1.62m-1.62-3.388a15.998 15.998 0 0 0 1.62-3.388" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-zinc-300">Your website will appear here</h3>
        <p className="mt-1 max-w-sm text-xs text-zinc-600">
          It will be built live as you chat. Start typing your request below and watch it come to life.
        </p>
      </div>
    );
  }

  // Active iframe preview (only when generated content has been applied)
  if (sandboxData?.url && hasBuiltContent) {
    return (
      <div className="relative w-full h-full">
        <iframe
          ref={iframeRef as React.RefObject<HTMLIFrameElement>}
          src={sandboxData.url}
          className="w-full h-full border-none"
          title="AI-Website sandbox preview"
          allow="clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          onLoad={onPreviewIframeLoad}
        />

        {visualSelectMode ? (
          <ComponentPreviewAskCard
            sandboxFiles={sandboxFiles}
            layoutSections={fileStructure.trim() || undefined}
          />
        ) : null}

        {visualSelectMode && visualEditingSelectedComponent ? (
          <VisualEditingToolbar
            selectedComponent={visualEditingSelectedComponent}
            iframeRef={iframeRef}
            isDynamic={false}
            hasStaticText
          />
        ) : null}

        {(previewError || previewHealthIssue) ? (
          <div className="absolute inset-0 z-[25] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-red-500/30 bg-black/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-red-500/25 bg-red-950/40 text-red-400">
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400">
                    Preview Issue In View Panel
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Review the details below, then use Fix with AI to send this issue for automatic repair.
                  </p>
                  <pre className="mt-2 max-h-[min(38vh,300px)] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/[0.06] bg-black/30 p-2.5 font-mono text-[11px] leading-relaxed text-zinc-300">
                    {previewError || previewHealthIssue}
                  </pre>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCopyPreviewError}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200"
                  aria-label="Copy error details"
                >
                  Copy Error
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewError(null);
                    setPreviewHealthIssue(null);
                  }}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200"
                  aria-label="Dismiss error"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (previewError) {
                      handleFixPreviewError();
                      return;
                    }
                    handleFixPreviewHealthIssue();
                  }}
                  className="rounded-lg bg-gradient-to-r from-primary via-primary-soft to-primary-accent px-3 py-1.5 text-xs font-semibold text-white shadow-soft-glow transition hover:opacity-95"
                >
                  Fix with AI
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Package installation overlay */}
        {codeApplicationState.stage &&
          codeApplicationState.stage !== 'complete' &&
          (codeApplicationState.stage === 'analyzing' ||
            codeApplicationState.stage === 'installing' ||
            codeApplicationState.stage === 'applying') && (
            <SandboxApplyOverlay
              stage={codeApplicationState.stage}
              packages={codeApplicationState.packages}
              installedPackages={codeApplicationState.installedPackages}
              filesGenerated={codeApplicationState.filesGenerated}
              message={codeApplicationState.message}
              currentFile={codeApplicationState.currentFile}
              deadlineAt={codeApplicationState.deadlineAt}
            />
          )}

        {/* Subtle indicator when code is being edited/generated */}
        {generationProgress.isGenerating && generationProgress.isEdit && !codeApplicationState.stage && (
          <div className="absolute right-4 top-4 z-[5] inline-flex items-center gap-2 rounded-xl border border-glow-cyan/20 bg-black/70 px-3 py-2 shadow-[0_0_24px_rgba(34,211,238,0.1)] backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glow-cyan opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-glow-cyan shadow-[0_0_6px_rgba(34,211,238,0.7)]" />
            </span>
            <span className="bg-gradient-to-r from-zinc-300 to-glow-cyan bg-clip-text text-xs font-medium text-transparent">
              Generating…
            </span>
          </div>
        )}

        {/* Refresh button */}
        <button
          data-testid="generation-refresh-sandbox"
          onClick={() => void reloadPreview()}
          className="absolute bottom-4 right-4 bg-black/70 hover:bg-black/90 text-zinc-400 hover:text-white p-2 rounded-xl border border-white/[0.08] shadow-lg transition-all duration-200 hover:scale-105 backdrop-blur-md"
          title="Refresh sandbox"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    );
  }

  // Default state when no sandbox and no screenshot
  return (
    <div className="flex items-center justify-center h-full bg-zinc-950 text-zinc-500">
      {screenshotError ? (
        <div className="text-center space-y-2">
          <p className="mb-1 text-sm text-zinc-400">Failed to capture screenshot</p>
          <p className="text-xs text-zinc-600">{screenshotError}</p>
          <button
            type="button"
            onClick={() => void reloadPreview()}
            className="inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200"
          >
            Reload View
          </button>
        </div>
      ) : sandboxData ? (
        <div className="w-full px-4 py-8">
          <GenerationCognitionLoader
            className="min-h-[260px] py-6"
            title="Loading preview"
            subtitle="Refreshing your live sandbox view..."
            autoProgress
            taskId="preview:loading"
            taskType="preview"
            orbSize="md"
          />
          <button
            type="button"
            onClick={() => void reloadPreview()}
            className="mx-auto mt-2 inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200"
          >
            Reload View
          </button>
        </div>
      ) : (
        <div className="text-center space-y-2">
          <p className="text-xs text-zinc-600">Start chatting to create your first app</p>
          <button
            type="button"
            onClick={() => void reloadPreview()}
            className="inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200"
          >
            Reload View
          </button>
        </div>
      )}
    </div>
  );
}

export const GenerationPreviewPanel = memo(GenerationPreviewPanelComponent);
