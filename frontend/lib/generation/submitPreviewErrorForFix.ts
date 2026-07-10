import React from 'react';
import type { ChatMessage } from '@/hooks/useWorkspaceChat';
import { getPreviewErrorSignature } from '@/lib/generation/pageUtils';

export interface SubmitPreviewErrorForFixDeps {
  autoPreviewRepairInFlightRef: React.MutableRefObject<boolean>;
  tryAutoInstallMissingPackagesFromError: (errorText: string) => Promise<boolean>;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
  setPreviewError: (v: string | null) => void;
  setPreviewHealthIssue: (v: string | null) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<'preview' | 'generation'>>;
  getMissingLocalImportsFromPreviewError: (errorText: string) => Array<{ importSource: string; importerPath: string }>;
  buildMissingLocalImportFixPrompt: (
    rawError: string,
    issues: Array<{ importSource: string; importerPath: string }>,
    previewFixChainOfThought: string
  ) => string;
  buildPreviewErrorFixPrompt: (rawError: string) => string;
  forceNextMessageAsEditRef: React.MutableRefObject<boolean>;
  sendChatMessageRef: React.MutableRefObject<((input?: import('../../hooks/useAgentChatMessage').SendChatMessageInput) => Promise<void>) | null>;
  PREVIEW_FIX_CHAIN_OF_THOUGHT: string;
}

export async function submitPreviewErrorForFix(
  rawError: string,
  deps: SubmitPreviewErrorForFixDeps
): Promise<void> {
  const {
    autoPreviewRepairInFlightRef,
    tryAutoInstallMissingPackagesFromError,
    addChatMessage,
    setPreviewError,
    setPreviewHealthIssue,
    setActiveTab,
    getMissingLocalImportsFromPreviewError,
    buildMissingLocalImportFixPrompt,
    buildPreviewErrorFixPrompt,
    forceNextMessageAsEditRef,
    sendChatMessageRef,
    PREVIEW_FIX_CHAIN_OF_THOUGHT,
  } = deps;

  const err = rawError.trim();
  if (!err) return;

  // Guard against double-clicks
  if (autoPreviewRepairInFlightRef.current) {
    return;
  }
  autoPreviewRepairInFlightRef.current = true;

  const autoInstallHandled = await tryAutoInstallMissingPackagesFromError(err);
  if (autoInstallHandled) {
    autoPreviewRepairInFlightRef.current = false;
    return;
  }

  setPreviewError(null);
  setPreviewHealthIssue(null);
  addChatMessage('Strengthening the code...', 'system');
  setActiveTab('generation');

  const localImportIssues = getMissingLocalImportsFromPreviewError(err);
  const fixPrompt =
    localImportIssues.length > 0
      ? buildMissingLocalImportFixPrompt(err, localImportIssues, PREVIEW_FIX_CHAIN_OF_THOUGHT)
      : buildPreviewErrorFixPrompt(err);
  forceNextMessageAsEditRef.current = true;
  if (sendChatMessageRef.current) {
    void sendChatMessageRef.current({ visible: 'Strengthening the code...', llm: fixPrompt });
  }
}
