'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight } from 'lucide-react';
import type { AgentStep, GenerationProgress } from '@/hooks/useGenerationProgress';

interface AgentStreamCardsProps {
  generationProgress: GenerationProgress;
  generationEstimatedPercent: number;
}

/**
 * Renders one collapsible card per agent (graph node). The card header shows
 * the agent label + status; clicking it expands the streamed content.
 * The currently active agent card auto-expands while it streams.
 */
export function AgentStreamCards({
  generationProgress,
  generationEstimatedPercent,
}: AgentStreamCardsProps) {
  const steps = (generationProgress.agentSteps ?? []).filter((s) => s.kind !== 'code');
  const allDone = steps.length > 0 && steps.every((s) => s.done);

  if (steps.length === 0) return null;

  const isSpinning = generationProgress.isGenerating && !allDone;

  return (
    <div className="flex max-w-full flex-col gap-2">
      {/* Overall status header */}
      <div className="inline-block max-w-full rounded-2xl border border-glow-purple/20 bg-gradient-to-br from-primary/10 via-background-soft to-background p-3 shadow-[0_0_40px_rgba(124,58,237,0.12)] backdrop-blur-md">
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
      </div>

      {/* Per-agent streaming cards */}
      {steps.map((step) => (
        <AgentStepCard key={step.id} step={step} />
      ))}
    </div>
  );
}

function AgentStepCard({ step }: { step: AgentStep }) {
  // null = "auto": expanded while the agent is active, collapsed once done.
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const expanded = manualExpanded ?? !step.done;

  return (
    <div className="max-w-full rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setManualExpanded(!expanded)}
        className="flex w-full items-center gap-2 p-3 text-left transition hover:bg-white/[0.03]"
      >
        {step.done ? (
          <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        ) : (
          <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-glow-cyan border-t-transparent animate-spin" />
        )}
        <span
          className={`flex-1 text-xs font-semibold ${
            step.done ? 'text-zinc-400' : 'text-zinc-100'
          }`}
        >
          {step.label}
        </span>
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${
            expanded ? 'rotate-90' : ''
          }`}
        />
      </button>

      {expanded && step.text && (
        <div
          className={`mx-3 mb-3 max-w-full overflow-x-auto text-xs leading-relaxed ${
            step.done ? 'text-zinc-400' : 'text-zinc-300'
          }`}
        >
          <StepContent text={step.text} done={step.done} />
        </div>
      )}
    </div>
  );
}

/**
 * While the agent is still streaming, content is partial and shown as plain
 * text. Once the step is done, JSON payloads (e.g. design specs, plans) are
 * rendered as a structured, human-readable tree instead of raw JSON.
 */
function StepContent({ text, done }: { text: string; done: boolean }) {
  if (done) {
    const parsed = tryParseJson(text);
    if (parsed !== null) {
      return (
        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-2.5">
          <JsonTree value={parsed} />
        </div>
      );
    }
  }
  return (
    <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
      {text}
    </div>
  );
}

function tryParseJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // The stream may contain narration around a JSON payload — extract the
    // outermost object/array if there is one.
    const match = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** "colorPalette" / "dark_mode" -> "Color Palette" / "Dark Mode" */
function formatKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function PrimitiveValue({ value }: { value: unknown }) {
  if (value === null) return <span className="italic text-zinc-500">null</span>;
  if (typeof value === 'boolean') {
    return <span className="text-amber-300">{value ? 'true' : 'false'}</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-amber-300">{String(value)}</span>;
  }
  return <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{String(value)}</span>;
}

function JsonTree({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const t = useTranslations('generation');

  if (value === null || typeof value !== 'object') {
    return <PrimitiveValue value={value} />;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="italic text-zinc-500">{t('stream.none')}</span>;
    return (
      <ul className="ml-1 space-y-1">
        {value.map((item, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="shrink-0 text-zinc-600">•</span>
            <div className="min-w-0 flex-1">
              {item !== null && typeof item === 'object' ? (
                <JsonTree value={item} depth={depth + 1} />
              ) : (
                <PrimitiveValue value={item} />
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, v]) => v !== undefined,
  );
  if (entries.length === 0) return <span className="italic text-zinc-500">{t('stream.empty')}</span>;

  return (
    <div className={depth > 0 ? 'mt-1 space-y-1 border-l border-white/10 pl-2.5' : 'space-y-1'}>
      {entries.map(([key, v]) => {
        const isObject = v !== null && typeof v === 'object';
        const isEmptyArray = Array.isArray(v) && v.length === 0;
        return (
          <div key={key} className="min-w-0">
            {isObject && !isEmptyArray ? (
              <>
                <div className="font-semibold text-glow-cyan/80">{formatKey(key)}</div>
                <JsonTree value={v} depth={depth + 1} />
              </>
            ) : (
              <div className="flex flex-wrap gap-x-1.5">
                <span className="shrink-0 font-semibold text-glow-cyan/80">
                  {formatKey(key)}:
                </span>
                {isEmptyArray ? (
                  <span className="italic text-zinc-500">{t('stream.none')}</span>
                ) : (
                  <PrimitiveValue value={v} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
