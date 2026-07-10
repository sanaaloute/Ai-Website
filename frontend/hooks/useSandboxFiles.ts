import { useCallback } from 'react';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import type { ChatMessage } from '@/hooks/useWorkspaceChat';
import type { GenerationProgress } from '@/hooks/useGenerationProgress';
import {
  fetchSandboxFiles as _fetchSandboxFiles,
  reloadPreview as _reloadPreview,
} from '@/lib/generation/sandboxActions';

export interface UseSandboxFilesDeps {
  // Sandbox state
  sandboxData: SandboxData | null;
  sandboxFileRecoverRef: React.MutableRefObject<boolean>;

  // Files
  setSandboxFiles: (files: Record<string, string>) => void;
  setFileStructure: (v: string) => void;

  // Generation progress
  setGenerationProgress: React.Dispatch<React.SetStateAction<GenerationProgress>>;

  // Chat
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
  requestAutoRestorePreferredProject: (preferredProjectId?: string | null) => string | null;
  mapSandboxFilesToGenerationFiles: (filesMap: Record<string, string>) => Array<{
    path: string;
    content: string;
    type: string;
    completed: boolean;
    edited?: boolean;
  }>;

  // Circular ref from useSandboxCreation
  createSandboxRef: React.MutableRefObject<
    ((options?:
      | boolean
      | {
          fromHomeScreen?: boolean;
          skipInitialFileFetch?: boolean;
          preserveProjectContext?: boolean;
          preserveCloudSelectionId?: string;
        }) => Promise<unknown>) | undefined
  >;

  // Preview refs / setters
  latestPreviewErrorRef: React.MutableRefObject<string | null>;
  lastPreviewErrorTextRef: React.MutableRefObject<string>;
  lastPreviewErrorAtRef: React.MutableRefObject<number>;
  setPreviewError: (v: string | null) => void;
  setPreviewHealthIssue: (v: string | null) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<'preview' | 'generation'>>;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;

  // Router / navigation
  searchParams: URLSearchParams;
  latestSandboxDataRef: React.MutableRefObject<SandboxData | null>;

  // Circular ref from useSandboxCreation for reloadPreview
  attachE2bSandboxRef: React.MutableRefObject<
    ((targetSandboxId: string, options?: { forceReconnect?: boolean }) => Promise<void>) | undefined
  >;
}

export function useSandboxFiles(deps: UseSandboxFilesDeps) {
  const {
    sandboxData,
    sandboxFileRecoverRef,
    setSandboxFiles,
    setFileStructure,
    setGenerationProgress,
    addChatMessage,
    requestAutoRestorePreferredProject,
    mapSandboxFilesToGenerationFiles,
    createSandboxRef,
    latestPreviewErrorRef,
    lastPreviewErrorTextRef,
    lastPreviewErrorAtRef,
    setPreviewError,
    setPreviewHealthIssue,
    setActiveTab,
    iframeRef,
    searchParams,
    latestSandboxDataRef,
    attachE2bSandboxRef,
  } = deps;

  const fetchSandboxFiles = useCallback(
    async (sandboxIdOverride?: string, options?: { suppressRecoveryMessage?: boolean }) => {
      await _fetchSandboxFiles(sandboxIdOverride, options, {
        sandboxData,
        sandboxFileRecoverRef,
        setSandboxFiles,
        setFileStructure,
        setGenerationProgress,
        addChatMessage,
        requestAutoRestorePreferredProject,
        createSandbox: createSandboxRef.current!,
        mapSandboxFilesToGenerationFiles,
        latestSandboxDataRef,
      });
    },
    [
      sandboxData,
      sandboxFileRecoverRef,
      setSandboxFiles,
      setFileStructure,
      setGenerationProgress,
      addChatMessage,
      requestAutoRestorePreferredProject,
      mapSandboxFilesToGenerationFiles,
      latestSandboxDataRef,
    ]
  );

  const reloadPreview = useCallback(async () => {
    await _reloadPreview({
      latestPreviewErrorRef,
      lastPreviewErrorTextRef,
      lastPreviewErrorAtRef,
      setPreviewError,
      setPreviewHealthIssue,
      setActiveTab,
      iframeRef,
      sandboxData,
      searchParams,
      latestSandboxDataRef,
      attachE2bSandbox: attachE2bSandboxRef.current!,
      requestAutoRestorePreferredProject,
      createSandbox: createSandboxRef.current!,
    });
  }, [
    latestPreviewErrorRef,
    lastPreviewErrorTextRef,
    lastPreviewErrorAtRef,
    setPreviewError,
    setPreviewHealthIssue,
    setActiveTab,
    iframeRef,
    sandboxData,
    searchParams,
    latestSandboxDataRef,
    requestAutoRestorePreferredProject,
  ]);

  return {
    fetchSandboxFiles,
    reloadPreview,
  };
}
