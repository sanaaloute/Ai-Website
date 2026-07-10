import { useEffect, useCallback } from 'react';
import type { MutableRefObject, RefObject, Dispatch, SetStateAction } from 'react';
import { handleDyadSandboxMessage } from '@/lib/visual-editing/dyadPreviewBridge';
import type { ComponentSelection, VisualEditingChange } from '@/lib/visual-editing/types';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import type { ChatMessage } from '@/hooks/useWorkspaceChat';
import { applyPreviewInlineText, reportPreviewError } from '@/lib/api/client';

export interface VisualEditingDeps {
  sandboxData: SandboxData | null;
  visualSelectMode: boolean;
  visualEditingSelectedComponent: ComponentSelection | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  latestSandboxDataRef: MutableRefObject<SandboxData | null>;
  visualEditingSelectedRef: MutableRefObject<ComponentSelection | null>;
  setPreviewIframeRefAtom: (iframe: HTMLIFrameElement | null) => void;
  setSelectedComponentsPreview: Dispatch<SetStateAction<ComponentSelection[]>>;
  setVisualEditingSelectedComponent: Dispatch<SetStateAction<ComponentSelection | null>>;
  setCurrentComponentCoordinates: Dispatch<SetStateAction<{ top: number; left: number; width: number; height: number } | null>>;
  setPendingVisualChanges: Dispatch<SetStateAction<Map<string, VisualEditingChange>>>;
  addChatMessageRef: MutableRefObject<(content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void>;
  lastPreviewReadyAtRef: MutableRefObject<number>;
  lastPreviewIframeLoadAtRef: MutableRefObject<number>;
  lastPreviewErrorTextRef: MutableRefObject<string>;
  lastPreviewErrorAtRef: MutableRefObject<number>;
  latestPreviewErrorRef: MutableRefObject<string | null>;
  setPreviewError: (v: string | null) => void;
  setPreviewHealthIssue: (v: string | null) => void;
  previewHealthIssue: string | null;
  submitPreviewErrorForFixRef: MutableRefObject<(rawError: string) => Promise<void>>;
}

export function useVisualEditing(deps: VisualEditingDeps) {
  const {
    sandboxData,
    visualSelectMode,
    visualEditingSelectedComponent,
    iframeRef,
    latestSandboxDataRef,
    visualEditingSelectedRef,
    setPreviewIframeRefAtom,
    setSelectedComponentsPreview,
    setVisualEditingSelectedComponent,
    setCurrentComponentCoordinates,
    setPendingVisualChanges,
    addChatMessageRef,
    lastPreviewReadyAtRef,
    lastPreviewIframeLoadAtRef,
    lastPreviewErrorTextRef,
    lastPreviewErrorAtRef,
    latestPreviewErrorRef,
    setPreviewError,
    setPreviewHealthIssue,
    previewHealthIssue,
    submitPreviewErrorForFixRef,
  } = deps;

  const syncVisualSelectModeToIframe = useCallback(() => {
    const w = iframeRef.current?.contentWindow;
    if (!w || !sandboxData?.url) return;
    if (visualSelectMode) {
      w.postMessage({ type: 'activate-dyad-component-selector' }, '*');
      w.postMessage({ type: 'activate-dyad-visual-editing' }, '*');
    } else {
      w.postMessage({ type: 'deactivate-dyad-component-selector' }, '*');
      w.postMessage({ type: 'deactivate-dyad-visual-editing' }, '*');
    }
  }, [visualSelectMode, sandboxData?.url]);

  const handlePreviewIframeLoad = useCallback(() => {
    lastPreviewIframeLoadAtRef.current = Date.now();
    setPreviewIframeRefAtom(iframeRef.current);
    // Re-activate selector after iframe navigations/reloads.
    syncVisualSelectModeToIframe();
  }, [setPreviewIframeRefAtom, syncVisualSelectModeToIframe]);

  useEffect(() => {
    visualEditingSelectedRef.current = visualEditingSelectedComponent;
  }, [visualEditingSelectedComponent]);

  useEffect(() => {
    setPreviewIframeRefAtom(iframeRef.current);
    return () => setPreviewIframeRefAtom(null);
  }, [sandboxData?.url, setPreviewIframeRefAtom]);

  useEffect(() => {
    if (!visualSelectMode) {
      setSelectedComponentsPreview([]);
      setVisualEditingSelectedComponent(null);
      setCurrentComponentCoordinates(null);
      setPendingVisualChanges(new Map());
    }
  }, [
    visualSelectMode,
    setSelectedComponentsPreview,
    setVisualEditingSelectedComponent,
    setCurrentComponentCoordinates,
    setPendingVisualChanges,
  ]);

  useEffect(() => {
    syncVisualSelectModeToIframe();
  }, [syncVisualSelectModeToIframe]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!sandboxData?.url) return;
      const currentPreviewWindow = iframeRef.current?.contentWindow;
      if (!currentPreviewWindow || event.source !== currentPreviewWindow) return;
      let expectedOrigin: string;
      try {
        expectedOrigin = new URL(sandboxData.url).origin;
      } catch {
        return;
      }
      if (event.origin !== expectedOrigin) return;

      const raw = event.data as {
        type?: string;
        text?: string;
        ts?: number;
        componentId?: string;
        runtimeId?: string;
      };
      if (raw && typeof raw.type === 'string' && raw.type === 'ai-website-request-inline-text-edit') {
        if (!visualSelectMode) return;
        const componentId = typeof raw.componentId === 'string' ? raw.componentId : '';
        if (!componentId) return;
        const runtimeId = typeof raw.runtimeId === 'string' ? raw.runtimeId : undefined;
        currentPreviewWindow.postMessage(
          { type: 'enable-dyad-text-editing', data: { componentId, runtimeId } },
          '*'
        );
        return;
      }

      if (
        handleDyadSandboxMessage(event.data, {
          visualEditingActive: visualSelectMode,
          iframeRef,
          setters: {
            setSelectedComponents: setSelectedComponentsPreview,
            setVisualEditingSelected: setVisualEditingSelectedComponent,
            setCurrentCoordinates: setCurrentComponentCoordinates,
            setPendingChanges: setPendingVisualChanges,
            selectedForEditName: visualEditingSelectedComponent?.name ?? '',
            getVisualEditingSelected: () => visualEditingSelectedRef.current,
            onTextFinalized: ({ text, previousText, relativePath, lineNumber, context }) => {
              if (text === previousText) return;
              const sandboxId = latestSandboxDataRef.current?.sandboxId;
              if (!sandboxId) {
                addChatMessageRef.current('No sandbox available to save preview text edits.', 'system');
                return;
              }
              void applyPreviewInlineText({
                sandboxId,
                relativePath,
                lineNumber,
                oldText: previousText,
                newText: text,
                context,
              })
                .then((result) => {
                  if (!result.ok) {
                    addChatMessageRef.current(
                      `Preview text save failed: ${result.error}`,
                      'error'
                    );
                    return;
                  }
                  addChatMessageRef.current(
                    `Saved preview text to ${relativePath} (line ${lineNumber}). Refresh the preview if hot reload did not pick it up.`,
                    'system'
                  );
                })
                .catch((err: Error) => {
                  addChatMessageRef.current(`Preview text save failed: ${err.message}`, 'error');
                });
            },
          },
        })
      ) {
        return;
      }

      const data = event.data as { type?: string; text?: string; ts?: number };
      if (!data || typeof data.type !== 'string') return;
      if (data.type === 'AI_WEBSITE_PREVIEW_READY') {
        lastPreviewReadyAtRef.current = typeof data.ts === 'number' ? data.ts : Date.now();
        lastPreviewErrorTextRef.current = '';
        lastPreviewErrorAtRef.current = 0;
        if (latestPreviewErrorRef.current) {
          setPreviewError(null);
        }
        if (previewHealthIssue) {
          setPreviewHealthIssue(null);
        }
        return;
      }
      if (data.type !== 'AI_WEBSITE_PREVIEW_ERROR' || typeof data.text !== 'string') return;
      const t = data.text.trim();
      if (!t) return;
      const now = Date.now();
      if (lastPreviewErrorTextRef.current === t && now - lastPreviewErrorAtRef.current < 1500) {
        return;
      }
      lastPreviewErrorTextRef.current = t;
      lastPreviewErrorAtRef.current = now;
      setPreviewError(t);
      setPreviewHealthIssue(null);

      // Persist raw preview error text server-side for diagnostics.
      void reportPreviewError({ error: t, type: 'preview-overlay', sandboxId: sandboxData?.sandboxId || '' }).catch((e) => {
        console.error('[visual-editing] report-preview-error failed:', e);
      });

      // Auto-fix for visual editing mode: if user is actively editing and preview breaks,
      // automatically submit for repair so they get immediate feedback.
      if (visualSelectMode) {
        void submitPreviewErrorForFixRef.current(t).catch((e) => {
          console.error('[visual-editing] Auto-fix submission failed:', e);
        });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [
    sandboxData?.url,
    previewHealthIssue,
    visualSelectMode,
    setSelectedComponentsPreview,
    setVisualEditingSelectedComponent,
    setCurrentComponentCoordinates,
    setPendingVisualChanges,
    setPreviewError,
    setPreviewHealthIssue,
    visualEditingSelectedComponent?.name,
  ]);

  return {
    syncVisualSelectModeToIframe,
    handlePreviewIframeLoad,
  };
}
