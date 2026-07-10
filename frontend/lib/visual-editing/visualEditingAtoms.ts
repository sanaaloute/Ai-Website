import { atom } from 'jotai';

import type { ComponentSelection, VisualEditingChange } from '@/lib/visual-editing/types';

/** Fired when the user asks to append component context to the generation chat draft. */
export type AppendChatContextRequest = { fragment: string; nonce: number };

export const appendChatContextRequestAtom = atom<AppendChatContextRequest | null>(null);

export const requestAppendChatContextAtom = atom(null, (_get, set, fragment: string) => {
  set(appendChatContextRequestAtom, { fragment, nonce: Date.now() + Math.random() });
});

/** Replaces the main generation chat draft (prompt + component reference from preview ask card). */
export type PreviewChatDraftRequest = { fullDraft: string; nonce: number };

export const previewChatDraftRequestAtom = atom<PreviewChatDraftRequest | null>(null);

export const requestPreviewChatDraftAtom = atom(null, (_get, set, fullDraft: string) => {
  set(previewChatDraftRequestAtom, { fullDraft, nonce: Date.now() + Math.random() });
});

export const selectedComponentsPreviewAtom = atom<ComponentSelection[]>([]);

export const visualEditingSelectedComponentAtom = atom<ComponentSelection | null>(null);

export const currentComponentCoordinatesAtom = atom<{
  top: number;
  left: number;
  width: number;
  height: number;
} | null>(null);

export const previewIframeRefAtom = atom<HTMLIFrameElement | null>(null);

export const annotatorModeAtom = atom<boolean>(false);

export const screenshotDataUrlAtom = atom<string | null>(null);

export const pendingVisualChangesAtom = atom<Map<string, VisualEditingChange>>(new Map());
