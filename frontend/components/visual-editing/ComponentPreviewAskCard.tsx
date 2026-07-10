'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Send, X } from 'lucide-react';

import {
  buildComponentLevelEditPrompt,
  resolveSandboxFileContent
} from '@/lib/visual-editing/buildPreviewChatContextFragment';
import {
  currentComponentCoordinatesAtom,
  pendingVisualChangesAtom,
  previewIframeRefAtom,
  requestPreviewChatDraftAtom,
  selectedComponentsPreviewAtom,
  visualEditingSelectedComponentAtom
} from '@/lib/visual-editing/visualEditingAtoms';

const GUTTER = 8;
const DEFAULT_CARD_W = 288;
const DEFAULT_CARD_H = 200;

type Coords = { top: number; left: number; width: number; height: number };

function computeFixedPosition(
  iframeRect: DOMRect,
  coords: Coords,
  cardW: number,
  cardH: number
): { left: number; top: number; width: number } {
  const m = GUTTER;
  const maxCardW = Math.min(DEFAULT_CARD_W, Math.max(160, iframeRect.width - 2 * m));
  const w = Math.min(Math.max(cardW, 160), maxCardW);

  const minL = iframeRect.left + m;
  const maxL = iframeRect.right - w - m;
  const minT = iframeRect.top + m;
  const maxT = iframeRect.bottom - cardH - m;

  const selL = iframeRect.left + coords.left;
  const selT = iframeRect.top + coords.top;
  const selR = selL + coords.width;
  const selB = selT + coords.height;

  const fitsH = (left: number) => left >= minL - 0.5 && left + w <= iframeRect.right - m + 0.5;
  const fitsV = (top: number) => top >= minT - 0.5 && top + cardH <= iframeRect.bottom - m + 0.5;

  // 1) To the right of the selection (avoids covering the component)
  let left = selR + m;
  let top = selT;

  if (fitsH(left) && fitsV(top)) {
    return { left, top, width: w };
  }

  // 2) To the left
  left = selL - w - m;
  top = selT;
  if (fitsH(left) && fitsV(top)) {
    return { left, top, width: w };
  }

  // 3) Below the selection
  left = maxL >= minL ? Math.max(minL, Math.min(selL + coords.width / 2 - w / 2, maxL)) : minL;
  top = selB + m;
  if (fitsV(top) && fitsH(left)) {
    return { left, top, width: w };
  }

  // 4) Above the selection
  top = selT - cardH - m;
  if (fitsV(top) && fitsH(left)) {
    return { left, top, width: w };
  }

  // 5) Clamp inside the preview iframe rect (fully visible)
  const clampedLeft = maxL >= minL ? Math.max(minL, Math.min(left, maxL)) : minL;
  const clampedTop = maxT >= minT ? Math.max(minT, Math.min(top, maxT)) : minT;

  return { left: clampedLeft, top: clampedTop, width: w };
}

export type ComponentPreviewAskCardProps = {
  /** Sandbox sources — used to inject full file into the component-level prompt. */
  sandboxFiles: Record<string, string>;
  /** Optional override for the Style line in APP CONTEXT. */
  style?: string;
  /** Optional override for Design rules in APP CONTEXT. */
  designRules?: string;
  /** Optional layout / structure summary (e.g. file tree). */
  layoutSections?: string;
};

export function ComponentPreviewAskCard({
  sandboxFiles,
  style,
  designRules,
  layoutSections
}: ComponentPreviewAskCardProps) {
  const selected = useAtomValue(visualEditingSelectedComponentAtom);
  const coords = useAtomValue(currentComponentCoordinatesAtom);
  const previewIframeRef = useAtomValue(previewIframeRefAtom);
  const setSelectedComponents = useSetAtom(selectedComponentsPreviewAtom);
  const setVisualSelected = useSetAtom(visualEditingSelectedComponentAtom);
  const setCoords = useSetAtom(currentComponentCoordinatesAtom);
  const setPendingChanges = useSetAtom(pendingVisualChangesAtom);
  const requestChatDraft = useSetAtom(requestPreviewChatDraftAtom);

  const [prompt, setPrompt] = useState('');
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [fixedStyle, setFixedStyle] = useState<{ left: number; top: number; width: number } | null>(
    null
  );

  const updatePosition = useCallback(() => {
    if (!coords || !selected || !previewIframeRef) {
      setFixedStyle(null);
      return;
    }
    const iframeRect = previewIframeRef.getBoundingClientRect();
    const el = cardRef.current;
    const cardW = el?.offsetWidth ?? DEFAULT_CARD_W;
    const cardH = el?.offsetHeight ?? DEFAULT_CARD_H;
    setFixedStyle(computeFixedPosition(iframeRect, coords, cardW, cardH));
  }, [coords, selected, previewIframeRef]);

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => updatePosition());
    return () => cancelAnimationFrame(raf);
  }, [updatePosition, prompt]);

  useEffect(() => {
    const onWin = () => updatePosition();
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, true);
    return () => {
      window.removeEventListener('resize', onWin);
      window.removeEventListener('scroll', onWin, true);
    };
  }, [updatePosition]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => updatePosition());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updatePosition, selected?.id]);

  useEffect(() => {
    const t = setTimeout(() => setPrompt(''), 0);
    return () => clearTimeout(t);
  }, [selected?.id, selected?.runtimeId]);

  const clearSelection = () => {
    if (!selected) return;
    setSelectedComponents([]);
    setVisualSelected(null);
    setCoords(null);
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.delete(selected.id);
      return next;
    });
    previewIframeRef?.contentWindow?.postMessage(
      {
        type: 'remove-dyad-component-overlay',
        componentId: selected.id,
        runtimeId: selected.runtimeId
      },
      '*'
    );
  };

  const handleSend = () => {
    if (!selected) return;
    const code = resolveSandboxFileContent(sandboxFiles, selected.relativePath) ?? '';
    const refText = buildComponentLevelEditPrompt(selected, {
      componentCode: code,
      userTask: prompt.trim(),
      style,
      designRules,
      layoutSections
    });
    requestChatDraft(refText);
    clearSelection();
  };

  const handleDismiss = () => {
    clearSelection();
  };

  if (!selected || !coords) return null;
  // Wait until layout places the card (fixed + portal; avoids clipping and wrong 0,0 paint).
  if (!fixedStyle) return null;

  const card = (
    <div
      ref={cardRef}
      className="pointer-events-auto flex max-h-[min(70vh,420px)] flex-col overflow-y-auto rounded-lg border border-white/10 bg-zinc-950/95 p-3 shadow-xl backdrop-blur-md"
      style={{
        position: 'fixed',
        left: fixedStyle.left,
        top: fixedStyle.top,
        width: fixedStyle.width,
        zIndex: 90
      }}
      data-testid="preview-component-ask-card"
    >
      <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-zinc-100" title={selected.name}>
            {selected.name}
          </p>
          <p
            className="truncate font-mono text-[10px] text-zinc-500"
            title={`${selected.relativePath}:${selected.lineNumber}`}
          >
            {selected.relativePath}:{selected.lineNumber}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.shiftKey) return;
          e.preventDefault();
          handleSend();
        }}
        placeholder="Ask AI to edit or delete"
        rows={2}
        className="mb-2 min-h-0 w-full shrink resize-none rounded-md border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none ring-0 transition focus:border-glow-cyan/40"
      />
      <button
        type="button"
        onClick={handleSend}
        className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-primary/90 to-primary-soft/80 px-3 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.25)] transition hover:opacity-95"
      >
        <Send className="h-3.5 w-3.5" aria-hidden />
        Submit
      </button>
    </div>
  );

  return createPortal(card, document.body);
}
