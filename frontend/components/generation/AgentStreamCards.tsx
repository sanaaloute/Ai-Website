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
  // Code streams ("Stream synthesis") must never appear in the main stream —
  // the code panel on the right is the single place where code is shown.
  const allSteps = generationProgress.agentSteps ?? [];
  const steps = allSteps.filter((s) => s.kind !== 'code');
  const allDone = allSteps.length > 0 && allSteps.every((s) => s.done);

  // The agent's real task list (streamed via todos_update events). Streamed
  // items carry a live status; the static stage-label fallback list does not,
  // which is how we tell them apart.
  const todos = generationProgress.todoList ?? [];
  const hasStreamedTodos = todos.some((t) => t.status !== undefined);

  // Visible while generating (even before the first agent token arrives, so it
  // fully replaces the old static steps card) or when there are steps to show.
  if (!generationProgress.isGenerating && steps.length === 0 && !hasStreamedTodos) return null;

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

      {/* Real task checklist: once the agent streams its todo list it takes
          the prominent spot under the header, replacing the static pipeline
          stages as the primary progress indicator. The per-agent cards below
          stay as the secondary live-reasoning feed. */}
      {hasStreamedTodos && (
        <TodoChecklist todos={todos} isGenerating={generationProgress.isGenerating} />
      )}

      {/* Per-agent streaming cards */}
      {steps.map((step) => (
        <AgentStepCard key={step.id} step={step} />
      ))}

      {/* Live activity: which agent is working right now. Keeps the main
          stream visibly alive during non-code phases (analyzer → validator)
          where no tokens stream, and points to the code panel while the
          executor is writing code. */}
      <AgentActivityIndicator generationProgress={generationProgress} />
    </div>
  );
}

const TODO_CHECKLIST_EXPANDED_KEY = 'ai-website:todoChecklistExpanded:v1';

function readTodoChecklistExpanded(): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(TODO_CHECKLIST_EXPANDED_KEY);
    return raw === null ? null : raw === '1';
  } catch {
    return null;
  }
}

function persistTodoChecklistExpanded(expanded: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(TODO_CHECKLIST_EXPANDED_KEY, expanded ? '1' : '0');
  } catch {
    // ignore
  }
}

/**
 * The agent's real task list as a collapsible dropdown. The header always
 * shows the aggregate summary ("Tasks — X of N done" + the in-progress task);
 * expanding reveals the full checklist. Defaults to expanded while a run is
 * active, collapsed once it ends; the user's manual toggle is remembered in
 * sessionStorage.
 */
function TodoChecklist({
  todos,
  isGenerating,
}: {
  todos: GenerationProgress['todoList'];
  isGenerating: boolean;
}) {
  // null = "auto": expanded while the run is active, collapsed once it ends.
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(() =>
    readTodoChecklistExpanded(),
  );
  const expanded = manualExpanded ?? isGenerating;

  const completedCount = todos.filter((t) => t.status === 'completed').length;
  const allDone = todos.length > 0 && completedCount === todos.length;
  const currentTodo = isGenerating ? todos.find((t) => t.status === 'in_progress') : undefined;

  const toggle = () => {
    const next = !expanded;
    setManualExpanded(next);
    persistTodoChecklistExpanded(next);
  };

  return (
    <div className="max-w-full rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 p-3 text-left transition hover:bg-white/[0.03]"
      >
        {allDone ? (
          <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        ) : isGenerating ? (
          <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-glow-cyan border-t-transparent animate-spin" />
        ) : (
          <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-zinc-700" />
        )}
        <span className="shrink-0 text-xs font-semibold text-zinc-100">Tasks</span>
        <span className="shrink-0 text-[11px] text-zinc-500">
          {completedCount} of {todos.length} done
        </span>
        {currentTodo ? (
          <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-500">
            {currentTodo.label}
          </span>
        ) : (
          <span className="flex-1" />
        )}
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform ${
            expanded ? 'rotate-90' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="mx-3 mb-3 flex flex-col gap-2">
          {todos.map((todo, i) => {
            const isCompleted = todo.status === 'completed';
            // Freeze the spinner once the run ends so an error doesn't leave a
            // task looking like it's still actively being worked on.
            const isActive = todo.status === 'in_progress' && isGenerating;
            return (
              <div key={i} className="flex items-center gap-2.5">
                {isCompleted ? (
                  <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                ) : isActive ? (
                  <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-glow-cyan border-t-transparent animate-spin" />
                ) : (
                  <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-zinc-700" />
                )}
                <span
                  className={`flex-1 text-xs ${
                    isCompleted
                      ? 'text-zinc-400'
                      : isActive
                        ? 'font-medium text-zinc-100'
                        : 'text-zinc-500'
                  }`}
                >
                  {todo.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AgentActivityIndicator({
  generationProgress,
}: {
  generationProgress: GenerationProgress;
}) {
  if (!generationProgress.isGenerating) return null;

  const allSteps = generationProgress.agentSteps ?? [];
  const activeStep = allSteps.find((s) => !s.done);

  let label: string;
  let detail: string | null = null;
  if (activeStep?.kind === 'code') {
    label = 'Writing code';
    detail = generationProgress.currentFile?.path ?? null;
  } else if (activeStep) {
    label = activeStep.label;
  } else {
    label = generationProgress.status || 'Working';
  }

  return (
    <div className="flex items-center gap-3 overflow-hidden rounded-xl border border-glow-cyan/20 bg-gradient-to-r from-glow-cyan/[0.07] via-primary/[0.07] to-transparent px-3 py-2.5">
      <span className="flex shrink-0 items-end gap-[3px]" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-glow-cyan"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium">
        <span className="animate-pulse bg-gradient-to-r from-zinc-100 via-glow-cyan to-zinc-100 bg-clip-text text-transparent">
          {label}
        </span>
        {detail ? (
          <span className="ml-1.5 font-mono text-[10px] text-zinc-500">{detail}</span>
        ) : null}
      </span>
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
          <StepContent text={step.text} done={step.done} kind={step.kind} />
        </div>
      )}
    </div>
  );
}

/**
 * Code streams ("Stream synthesis") render as a raw code block. Thinking
 * streams render as plain text — except JSON-ish payloads (design specs,
 * plans), which are sanitized into readable lines even while still streaming.
 * Once the step is done, JSON payloads are rendered as a structured,
 * human-readable tree instead of raw JSON.
 */
function StepContent({ text, done, kind }: { text: string; done: boolean; kind: AgentStep['kind'] }) {
  if (kind === 'code') {
    return (
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-lg border border-white/[0.06] bg-black/30 p-2.5 font-mono text-[11px] leading-relaxed text-zinc-300">
        {text}
      </pre>
    );
  }

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
      {sanitizeStreamingText(text)}
    </div>
  );
}

/**
 * Sanitizes text an agent is still streaming. Prose passes through untouched;
 * JSON-ish payloads are converted into readable "Key: value" lines so the raw
 * JSON is never shown. Never throws — partial input is expected.
 */
function sanitizeStreamingText(text: string): string {
  // Strip markdown code fences the model may wrap payloads in.
  const cleaned = text.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '');
  const trimmed = cleaned.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return text;
  const sanitized = sanitizePartialJson(trimmed);
  return sanitized || text;
}

/**
 * Tolerant partial-JSON reader. Walks (possibly incomplete) JSON and renders
 * it as indented "Key: value" lines with "•" bullets for array items. Never
 * throws: unterminated strings/structures simply render what has arrived.
 */
function sanitizePartialJson(input: string): string {
  let i = 0;
  const n = input.length;
  const lines: string[] = [];

  const skipWs = () => {
    while (i < n && /\s/.test(input[i])) i++;
  };

  const readString = (): string => {
    // Assumes input[i] is the opening quote.
    i++;
    let out = '';
    while (i < n) {
      const c = input[i];
      if (c === '\\' && i + 1 < n) {
        const next = input[i + 1];
        if (next === 'u' && i + 5 < n) {
          const code = parseInt(input.slice(i + 2, i + 6), 16);
          out += Number.isNaN(code) ? '' : String.fromCharCode(code);
          i += 6;
          continue;
        }
        const escapes: Record<string, string> = {
          n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f',
        };
        out += escapes[next] ?? next;
        i += 2;
        continue;
      }
      if (c === '"') {
        i++;
        return out;
      }
      out += c;
      i++;
    }
    return out; // Unterminated — return what has arrived so far.
  };

  const readPrimitive = (): string => {
    let out = '';
    while (i < n && !/[,}\]]/.test(input[i])) {
      out += input[i];
      i++;
    }
    return out.trim();
  };

  // Reads an inline (non-structural) value: quoted string or primitive.
  const readInlineValue = (): string => {
    skipWs();
    if (input[i] === '"') return readString();
    return readPrimitive();
  };

  const INDENT = '  ';

  const parseValue = (depth: number, prefix: string): void => {
    skipWs();
    if (i >= n) return;
    const c = input[i];
    if (c === '{' || c === '[') {
      // Structural item: the bullet (if any) gets its own line, contents indent.
      if (prefix) {
        lines.push(`${INDENT.repeat(depth)}${prefix.trimEnd()}`);
        depth += 1;
      }
      i++;
      if (c === '{') parseObject(depth);
      else parseArray(depth);
    } else {
      const value = readInlineValue();
      if (value) lines.push(`${INDENT.repeat(depth)}${prefix}${value}`);
    }
  };

  const parseObject = (depth: number): void => {
    while (i < n) {
      skipWs();
      if (i >= n) return;
      const c = input[i];
      if (c === '}') {
        i++;
        return;
      }
      if (c === ',') {
        i++;
        continue;
      }
      if (c !== '"') {
        i++; // Skip stray characters defensively.
        continue;
      }
      const key = readString();
      skipWs();
      if (input[i] === ':') i++;
      skipWs();
      if (input[i] === '{' || input[i] === '[') {
        lines.push(`${INDENT.repeat(depth)}${formatKey(key)}:`);
        const opener = input[i];
        i++;
        if (opener === '{') parseObject(depth + 1);
        else parseArray(depth + 1);
      } else {
        const value = readInlineValue();
        lines.push(`${INDENT.repeat(depth)}${formatKey(key)}: ${value}`);
      }
    }
  };

  const parseArray = (depth: number): void => {
    while (i < n) {
      skipWs();
      if (i >= n) return;
      const c = input[i];
      if (c === ']') {
        i++;
        return;
      }
      if (c === ',') {
        i++;
        continue;
      }
      parseValue(depth, '• ');
    }
  };

  parseValue(0, '');
  return lines.join('\n');
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
