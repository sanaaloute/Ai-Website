import type { Dispatch, RefObject, SetStateAction } from 'react';

import { parseComponentSelection, parseDyadComponentId } from '@/lib/visual-editing/parseComponentSelection';
import type { ComponentSelection, VisualEditingChange } from '@/lib/visual-editing/types';

export type DyadBridgeSetters = {
  setSelectedComponents: Dispatch<SetStateAction<ComponentSelection[]>>;
  setVisualEditingSelected: Dispatch<SetStateAction<ComponentSelection | null>>;
  setCurrentCoordinates: Dispatch<
    SetStateAction<{ top: number; left: number; width: number; height: number } | null>
  >;
  setPendingChanges: Dispatch<SetStateAction<Map<string, VisualEditingChange>>>;
  /** Current primary selection name for pending text edits */
  selectedForEditName: string;
  /** Snapshot for deselect coordination (avoid nested setState) */
  getVisualEditingSelected: () => ComponentSelection | null;
  /** After source file text is committed in the preview (blur / disable editing). */
  onTextFinalized?: (payload: {
    componentId: string;
    text: string;
    previousText: string;
    relativePath: string;
    lineNumber: number;
    context?: {
      parentText?: string;
      previousSiblingText?: string;
      nextSiblingText?: string;
      tagName?: string;
    };
  }) => void;
};

/**
 * Handles postMessage payloads from Dyad scripts in the sandbox iframe.
 * Returns true if the message was consumed (caller should return early).
 */
export function handleDyadSandboxMessage(
  data: unknown,
  ctx: {
    visualEditingActive: boolean;
    iframeRef: RefObject<HTMLIFrameElement | null>;
    setters: DyadBridgeSetters;
  }
): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as { type?: string; [k: string]: unknown };
  const type = d.type;
  if (typeof type !== 'string' || !type.startsWith('dyad-')) return false;

  const { iframeRef, visualEditingActive, setters } = ctx;
  const cw = iframeRef.current?.contentWindow;

  switch (type) {
    case 'dyad-component-selector-initialized':
      // Selector is ready; no subscription/plan gate — parent handles activation via activate-dyad-* messages.
      return true;

    case 'dyad-text-updated': {
      const componentId = d.componentId as string | undefined;
      const text = d.text as string | undefined;
      if (!componentId || text === undefined) return true;
      const parsed = parseDyadComponentId(componentId);
      if (!parsed) return true;
      setters.setPendingChanges((prev) => {
        const next = new Map(prev);
        const existing = next.get(componentId);
        next.set(componentId, {
          componentId,
          componentName: existing?.componentName || setters.selectedForEditName || '',
          relativePath: parsed.relativePath,
          lineNumber: parsed.lineNumber,
          styles: existing?.styles || {},
          textContent: text
        });
        return next;
      });
      return true;
    }

    case 'dyad-text-finalized': {
      const componentId = d.componentId as string | undefined;
      const text = d.text as string | undefined;
      const previousText =
        typeof d.previousText === 'string' ? d.previousText : '';
      const context =
        d.context && typeof d.context === 'object'
          ? (d.context as {
              parentText?: string;
              previousSiblingText?: string;
              nextSiblingText?: string;
              tagName?: string;
            })
          : undefined;
      if (!componentId || text === undefined) return true;
      const parsed = parseDyadComponentId(componentId);
      if (!parsed) return true;
      setters.setPendingChanges((prev) => {
        const next = new Map(prev);
        const existing = next.get(componentId);
        next.set(componentId, {
          componentId,
          componentName: existing?.componentName || setters.selectedForEditName || '',
          relativePath: parsed.relativePath,
          lineNumber: parsed.lineNumber,
          styles: existing?.styles || {},
          textContent: text
        });
        return next;
      });
      setters.onTextFinalized?.({
        componentId,
        text,
        previousText,
        relativePath: parsed.relativePath,
        lineNumber: parsed.lineNumber,
        context
      });
      return true;
    }

    case 'dyad-text-editing-cancelled': {
      const componentId = d.componentId as string | undefined;
      if (componentId) {
        setters.setPendingChanges((prev) => {
          const next = new Map(prev);
          next.delete(componentId);
          return next;
        });
      }
      return true;
    }

    case 'dyad-component-selected': {
      if (!visualEditingActive) return true;
      const component = parseComponentSelection(data);
      if (!component) return true;
      if (d.coordinates && typeof d.coordinates === 'object') {
        const c = d.coordinates as { top: number; left: number; width: number; height: number };
        setters.setCurrentCoordinates(c);
      }
      // Single selection: only one component at a time (new pick replaces the previous).
      setters.setSelectedComponents([component]);
      if (visualEditingActive) {
        setters.setVisualEditingSelected(component);
      }
      return true;
    }

    case 'dyad-component-deselected': {
      const componentId = d.componentId as string | undefined;
      const runtimeId = d.runtimeId as string | undefined;
      if (componentId) {
        cw?.postMessage(
          {
            type: 'disable-dyad-text-editing',
            data: { componentId }
          },
          '*'
        );
        setters.setSelectedComponents((prev) =>
          prev.filter((c) =>
            runtimeId && c.runtimeId ? c.runtimeId !== runtimeId : c.id !== componentId
          )
        );
        const currentPrimary = setters.getVisualEditingSelected();
        const wasPrimary =
          runtimeId && currentPrimary?.runtimeId
            ? currentPrimary.runtimeId === runtimeId
            : currentPrimary?.id === componentId;
        setters.setVisualEditingSelected((prev) =>
          runtimeId && prev?.runtimeId
            ? prev.runtimeId === runtimeId
              ? null
              : prev
            : prev?.id === componentId
              ? null
              : prev
        );
        if (wasPrimary) setters.setCurrentCoordinates(null);
      }
      return true;
    }

    case 'dyad-component-coordinates-updated':
      if (visualEditingActive && d.coordinates && typeof d.coordinates === 'object') {
        const c = d.coordinates as { top: number; left: number; width: number; height: number };
        setters.setCurrentCoordinates(c);
      }
      return true;

    default:
      return true;
  }
}
