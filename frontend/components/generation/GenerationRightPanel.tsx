'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { MousePointerClick, Code2, Eye, RefreshCw, ExternalLink, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { GenerationPreviewPanelProps } from '@/components/generation/GenerationPreviewPanel';

const GenerationWorkspace = dynamic(
  () =>
    import('@/components/generation/GenerationWorkspace').then(
      (mod) => mod.GenerationWorkspace
    ),
  {
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-glow-cyan/30 border-t-glow-cyan" />
      </div>
    ),
    ssr: false,
  }
);

export interface RightPanelWorkspace extends GenerationPreviewPanelProps {
  activeTab: 'generation' | 'preview';
  setActiveTab: (tab: 'generation' | 'preview') => void;
  setVisualSelectMode: React.Dispatch<React.SetStateAction<boolean>>;
  codeDisplayRef: React.RefObject<HTMLDivElement>;
  expandedFolders: Set<string>;
  generationEstimatedPercent: number;
  handleFileClick: (filePath: string) => void;
  handlePreviewIframeLoad: () => void;
  selectedFile: string | null;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedFile: React.Dispatch<React.SetStateAction<string | null>>;
  toggleFolder: (folderPath: string) => void;
  renameSandboxFile?: (oldPath: string, newName: string) => Promise<void> | void;
  deleteSandboxFile?: (path: string) => Promise<void> | void;
}

interface GenerationRightPanelProps {
  workspace: RightPanelWorkspace;
}

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Elapsed-time counter shown while a generation is running. Resets whenever
 * generation stops and starts again.
 */
function GenerationTimer({ isGenerating }: { isGenerating: boolean }) {
  const startedAtRef = useRef<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!isGenerating) {
      startedAtRef.current = null;
      return;
    }
    startedAtRef.current = Date.now();
    setNowMs(Date.now());
    const intervalId = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [isGenerating]);

  if (!isGenerating || startedAtRef.current === null) return null;

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtRef.current) / 1000));

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-xs font-medium text-zinc-400"
      title="Elapsed generation time"
    >
      <Clock className="h-3 w-3 shrink-0 text-glow-cyan/70" />
      <span className="tabular-nums text-zinc-200">{formatElapsed(elapsedSeconds)}</span>
      <span className="hidden text-zinc-500 lg:inline">
        · Full projects can take up to 1 hour
      </span>
    </div>
  );
}

function GenerationRightPanelComponent({ workspace }: GenerationRightPanelProps) {
  const {
    activeTab,
    setActiveTab,
    generationProgress,
    visualSelectMode,
    setVisualSelectMode,
    sandboxData,
    reloadPreview,
  } = workspace;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-black/40 px-3 py-2">
        <div className="flex items-center gap-3">
          {/* Tab switcher */}
          <div className="inline-flex rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
            <button
              data-testid="generation-tab-code"
              type="button"
              onClick={() => setActiveTab('generation')}
              className={cn(
                'relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                activeTab === 'generation'
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {activeTab === 'generation' && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 rounded-md bg-white/[0.08]"
                  transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
                />
              )}
              <Code2 className="relative h-3.5 w-3.5" />
              <span className="relative">Code</span>
            </button>
            <button
              data-testid="generation-tab-view"
              type="button"
              onClick={() => setActiveTab('preview')}
              className={cn(
                'relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                activeTab === 'preview'
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {activeTab === 'preview' && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 rounded-md bg-white/[0.08]"
                  transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
                />
              )}
              <Eye className="relative h-3.5 w-3.5" />
              <span className="relative">Preview</span>
            </button>
          </div>

          {activeTab === 'generation' && !generationProgress.isEdit && generationProgress.files.length > 0 && (
            <span className="text-xs text-zinc-600">
              {generationProgress.files.length} files
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {activeTab === 'generation' && generationProgress.isGenerating && (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-glow-cyan/15 bg-glow-cyan/5 px-2 py-1 text-xs font-medium text-glow-cyan">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-glow-cyan shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
              {generationProgress.isEdit ? 'Editing' : 'Generating'}
            </div>
          )}

          <GenerationTimer isGenerating={generationProgress.isGenerating} />

          {activeTab === 'preview' && sandboxData?.url ? (
            <button
              type="button"
              onClick={() => setVisualSelectMode((v) => !v)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition',
                visualSelectMode
                  ? 'border-glow-cyan/20 bg-glow-cyan/10 text-glow-cyan'
                  : 'border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
              )}
              title={visualSelectMode ? 'Exit selection' : 'Select & edit'}
            >
              <MousePointerClick className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">{visualSelectMode ? 'Selecting' : 'Select'}</span>
            </button>
          ) : null}

          {activeTab === 'preview' && (
            <button
              type="button"
              data-testid="generation-reload-view-toolbar"
              onClick={() => void reloadPreview()}
              className="inline-flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-200"
              title="Reload preview"
            >
              <RefreshCw className="h-3 w-3" />
              <span className="hidden sm:inline">Reload</span>
            </button>
          )}

          {sandboxData && (
            <div className="inline-flex items-center gap-1 rounded-md border border-emerald-500/10 bg-emerald-500/5 px-2 py-1 text-xs font-medium text-emerald-400/80">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
              Live
            </div>
          )}

          {sandboxData && (
            <a
              href={sandboxData.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/[0.04] hover:text-glow-cyan"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <GenerationWorkspace workspace={workspace} />
      </div>
    </div>
  );
}

export const GenerationRightPanel = memo(GenerationRightPanelComponent);
