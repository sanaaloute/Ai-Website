'use client';

import type { GenerationProgress } from '@/hooks/useGenerationProgress';

interface GenerationProgressPanelProps {
  generationProgress: GenerationProgress;
  generationEstimatedPercent: number;
}

export function GenerationProgressPanel({
  generationProgress,
  generationEstimatedPercent,
}: GenerationProgressPanelProps) {
  const hasTodos = generationProgress.todoList.length > 0;
  const allDone = hasTodos && generationProgress.todoList.every((t) => t.done);

  // Show panel while generating or when there is active work to display.
  // Hide once all todos are done and generation has finished.
  if ((!hasTodos || allDone) && !generationProgress.isGenerating) return null;

  // Highlight the active (in_progress) todo first. If none is active, try to
  // match the file currently being written against an incomplete todo's label.
  // Otherwise fall back to the first incomplete todo. Never re-highlight a done item.
  const currentStepIndex = hasTodos
    ? (() => {
        const active = generationProgress.todoList.findIndex((t) => t.status === 'in_progress');
        if (active !== -1) return active;

        const currentFilePath = generationProgress.currentFile?.path;
        if (currentFilePath) {
          const normalizedPath = currentFilePath.toLowerCase();
          const basename = normalizedPath.split('/').pop() || normalizedPath;
          const matched = generationProgress.todoList.findIndex((t) => {
            if (t.done) return false;
            const content = t.label.toLowerCase();
            return content.includes(normalizedPath) || content.includes(basename);
          });
          if (matched !== -1) return matched;
        }

        return generationProgress.todoList.findIndex((t) => !t.done);
      })()
    : -1;

  const isSpinning = generationProgress.isGenerating && !allDone;

  return (
    <div className="inline-block max-w-full rounded-2xl border border-glow-purple/20 bg-gradient-to-br from-primary/10 via-background-soft to-background p-4 shadow-[0_0_40px_rgba(124,58,237,0.12)] backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0">
        {isSpinning ? (
          <div className="h-4 w-4 shrink-0 rounded-full border-2 border-glow-cyan border-t-transparent animate-spin" />
        ) : (
          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
        <div className="min-w-0 break-words [overflow-wrap:anywhere] bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-sm font-medium text-transparent">
          {generationProgress.status}
        </div>
        <span className="shrink-0 rounded-full border border-glow-cyan/35 bg-glow-cyan/10 px-2.5 py-1 text-xs font-semibold text-glow-cyan">
          {generationEstimatedPercent}%
        </span>
      </div>

      {hasTodos && (
        <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
          {generationProgress.todoList.map((item, idx) => {
            const isCurrent = idx === currentStepIndex;
            return (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span
                  className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] ${
                    item.done
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : isCurrent
                        ? 'bg-glow-cyan/20 text-glow-cyan'
                        : 'bg-white/10 text-zinc-500'
                  }`}
                >
                  {item.done ? (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </span>
                <span
                  className={
                    item.done
                      ? 'text-zinc-500 line-through'
                      : isCurrent
                        ? 'font-semibold text-zinc-100'
                        : 'text-zinc-300'
                  }
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
