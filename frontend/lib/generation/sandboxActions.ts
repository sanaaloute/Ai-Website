import React from 'react';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import type { ChatMessage } from '@/hooks/useWorkspaceChat';
import { attachSandbox, getSandboxFiles, installPackages as apiInstallPackages, restartPreview as apiRestartPreview } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/generation/pageUtils';
import type { GenerationProgress } from '@/hooks/useGenerationProgress';
import { assertCurrentSandboxId, assertCurrentSandboxIdStrict, getCurrentSandboxId, setLastCreatedSandbox } from '@/lib/sandbox/sandboxClientSession';
import { replaceGenerationSearchParams } from '@/lib/generation/urlUtils';

interface AttachE2bSandboxDeps {
  sandboxData: SandboxData | null;
  setSandboxData: (data: SandboxData | null) => void;
  persistSnapshotToCloud: (sandboxId?: string) => Promise<boolean>;
  setE2bAttachBusy: (v: boolean) => void;
  setLoading: (v: boolean) => void;
  setShowLoadingBackground: (v: boolean) => void;
  updateStatus: (text: string, active: boolean) => void;
  setResponseArea: (v: string[]) => void;
  setScreenshotError: (v: string | null) => void;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
  requestAutoRestorePreferredProject: (preferredProjectId?: string | null) => string | null;
  searchParams: URLSearchParams;
  fetchSandboxFiles: (sandboxIdOverride?: string) => Promise<void>;
  /** Ref to latest sandbox data so attach can reject stale IDs. */
  latestSandboxDataRef?: React.MutableRefObject<SandboxData | null>;
}

export async function attachE2bSandbox(
  targetSandboxId: string,
  deps: AttachE2bSandboxDeps
): Promise<void> {
  const {
    sandboxData,
    setSandboxData,
    persistSnapshotToCloud,
    setE2bAttachBusy,
    setLoading,
    setShowLoadingBackground,
    updateStatus,
    setResponseArea,
    setScreenshotError,
    addChatMessage,
    requestAutoRestorePreferredProject,
    searchParams,
    fetchSandboxFiles,
    latestSandboxDataRef,
  } = deps;

  if (!targetSandboxId) return;

  // Reject stale sandbox IDs: if the session has moved on, don't attach a dead sandbox.
  const currentId = latestSandboxDataRef?.current?.sandboxId ?? getCurrentSandboxId();
  if (currentId && currentId !== targetSandboxId) {
    console.warn(
      `[attachE2bSandbox] Rejecting stale ID ${targetSandboxId} (current session is ${currentId}).`
    );
    return;
  }

  if (sandboxData?.sandboxId === targetSandboxId) return;

  // Double-check before making the API call
  if (!assertCurrentSandboxIdStrict(targetSandboxId, 'attachE2bSandbox')) {
    return;
  }

  if (sandboxData?.sandboxId) {
    await persistSnapshotToCloud(sandboxData.sandboxId);
  }

  setE2bAttachBusy(true);
  setLoading(true);
  setShowLoadingBackground(true);
  updateStatus('Attaching sandbox...', false);
  setResponseArea([]);
  setScreenshotError(null);

  try {
    // Attach can be slow when the backend is reconnecting to E2B, and some
    // browsers/proxies abort long-pending cross-origin requests. Retry once on
    // network-level failures (status 0 / Failed to fetch) before giving up.
    let lastError: Error | null = null;
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await attachSandbox(targetSandboxId);
      if (result.ok && result.data.success && result.data.sandboxData) {
        const json = result.data;
        const attachedSandboxId = json.sandboxData!.sandboxId || targetSandboxId;

        // Validate the returned ID is still current before accepting it
        if (!assertCurrentSandboxId(targetSandboxId, 'attachE2bSandbox')) {
          return;
        }

        setSandboxData(json.sandboxData as SandboxData);
        setLastCreatedSandbox(json.sandboxData as SandboxData);
        updateStatus('Sandbox active', true);
        if (json.recovered) {
          requestAutoRestorePreferredProject();
        }

        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('new');
        newParams.delete('from');
        newParams.set('sandbox', attachedSandboxId);
        replaceGenerationSearchParams(newParams);

        setTimeout(() => {
          void fetchSandboxFiles(attachedSandboxId);
        }, 1000);
        return;
      }

      const errorMessage = result.ok
        ? 'Failed to attach sandbox.'
        : result.error || 'Failed to attach sandbox.';
      lastError = new Error(errorMessage);

      // Only retry on network-level failures (status 0). HTTP errors from the
      // backend should be surfaced immediately.
      const isNetworkError = !result.ok && result.status === 0;
      if (!isNetworkError || attempt === maxAttempts) {
        break;
      }

      console.warn(
        `[attachE2bSandbox] Network error on attempt ${attempt}, retrying...`,
        errorMessage
      );
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (lastError) {
      throw lastError;
    }
  } catch (error: unknown) {
    console.error('[attachE2bSandbox] Error:', error);
    updateStatus('Error', false);
    addChatMessage(
      `Failed to attach sandbox: ${getErrorMessage(error)}`,
      'error'
    );
  } finally {
    setLoading(false);
    setShowLoadingBackground(false);
    setE2bAttachBusy(false);
  }
}

interface FetchSandboxFilesDeps {
  sandboxData: SandboxData | null;
  sandboxFileRecoverRef: React.MutableRefObject<boolean>;
  setSandboxFiles: (files: Record<string, string>) => void;
  setFileStructure: (v: string) => void;
  setGenerationProgress: React.Dispatch<React.SetStateAction<GenerationProgress>>;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
  requestAutoRestorePreferredProject: (preferredProjectId?: string | null) => string | null;
  createSandbox: (options?: boolean | {
    fromHomeScreen?: boolean;
    skipInitialFileFetch?: boolean;
    preserveProjectContext?: boolean;
    preserveCloudSelectionId?: string;
  }) => Promise<unknown>;
  mapSandboxFilesToGenerationFiles: (filesMap: Record<string, string>) => Array<{
    path: string;
    content: string;
    type: string;
    completed: boolean;
    edited?: boolean;
  }>;
  /** Ref to latest sandbox data for stale-ID rejection. */
  latestSandboxDataRef?: React.MutableRefObject<SandboxData | null>;
}

export async function fetchSandboxFiles(
  sandboxIdOverride: string | undefined,
  options: { suppressRecoveryMessage?: boolean } | undefined,
  deps: FetchSandboxFilesDeps
): Promise<void> {
  const {
    sandboxData,
    sandboxFileRecoverRef,
    setSandboxFiles,
    setFileStructure,
    setGenerationProgress,
    addChatMessage,
    requestAutoRestorePreferredProject,
    createSandbox,
    mapSandboxFilesToGenerationFiles,
    latestSandboxDataRef,
  } = deps;

  const effectiveSandboxId = sandboxIdOverride || sandboxData?.sandboxId;
  if (!effectiveSandboxId && !sandboxFileRecoverRef.current) return;

  // Reject stale sandbox IDs before making the API call.
  const currentId = latestSandboxDataRef?.current?.sandboxId ?? getCurrentSandboxId();
  if (currentId && effectiveSandboxId && currentId !== effectiveSandboxId) {
    console.warn(
      `[fetchSandboxFiles] Rejecting stale ID ${effectiveSandboxId} (current session is ${currentId}).`
    );
    return;
  }

  if (!assertCurrentSandboxIdStrict(effectiveSandboxId || '', 'fetchSandboxFiles')) {
    return;
  }

  const filesQs = effectiveSandboxId
    ? `?sandboxId=${encodeURIComponent(effectiveSandboxId)}`
    : '';

  try {
    const result = effectiveSandboxId
      ? await getSandboxFiles(effectiveSandboxId)
      : { ok: false as const, status: 400, statusText: 'Bad Request', error: 'Missing sandboxId' };

    const data = result.ok
      ? result.data
      : {
          success: false as const,
          code: undefined,
          files: undefined,
          structure: undefined,
          error: result.error,
        };

    const sandboxMissing =
      data.code === 'SANDBOX_GONE' ||
      /sandbox.*not found/i.test(data.error || '') ||
      /not found.*sandbox/i.test(data.error || '');

    if (!result.ok && sandboxMissing && !sandboxFileRecoverRef.current) {
      sandboxFileRecoverRef.current = true;
      if (!options?.suppressRecoveryMessage) {
        addChatMessage(
          'Your preview sandbox expired or was reset (normal after idle time or a server restart). Creating a fresh sandbox…',
          'system'
        );
      }
      try {
        requestAutoRestorePreferredProject();
        const created = await createSandbox({
          fromHomeScreen: true,
          preserveProjectContext: true,
        });
        await new Promise((r) => setTimeout(r, 600));
        const retryId = (created as SandboxData | null)?.sandboxId ?? effectiveSandboxId;
        if (retryId) {
          const retryResult = await getSandboxFiles(retryId);
          if (retryResult.ok && retryResult.data.success && retryResult.data.files && Object.keys(retryResult.data.files).length > 0) {
            setSandboxFiles(retryResult.data.files || {});
            setFileStructure(retryResult.data.structure || '');
            const files = mapSandboxFilesToGenerationFiles(retryResult.data.files || {});
            setGenerationProgress((prev) => ({ ...prev, files }));
          }
        }
      } finally {
        sandboxFileRecoverRef.current = false;
      }
      return;
    }

    if (result.ok && data.success) {
      const newFiles = data.files || {};
      const mapped = mapSandboxFilesToGenerationFiles(newFiles);

      // Guard against the live sandbox returning an empty file list while it is
      // still restoring (common during Supabase project open / reload). If we
      // already have files from a snapshot or earlier fetch, keep them.
      setGenerationProgress((prev) => {
        const keepPrev = mapped.length === 0 && prev.files.length > 0;
        if (keepPrev) {
          console.log('[fetchSandboxFiles] Live fetch returned empty; preserving existing files.');
        }
        return {
          ...prev,
          files: keepPrev ? prev.files : mapped,
        };
      });

      // Only overwrite sandboxFiles/structure when the live response has data.
      if (Object.keys(newFiles).length > 0) {
        setSandboxFiles(newFiles);
        setFileStructure(data.structure || '');
      }
      console.log('[fetchSandboxFiles] Updated file list:', Object.keys(newFiles).length, 'files');
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[fetchSandboxFiles] Error fetching files:', error);
    addChatMessage(`Failed to fetch sandbox files: ${msg}`, 'system');
  }
}

interface ReloadPreviewDeps {
  latestPreviewErrorRef: React.MutableRefObject<string | null>;
  lastPreviewErrorTextRef: React.MutableRefObject<string>;
  lastPreviewErrorAtRef: React.MutableRefObject<number>;
  setPreviewError: (v: string | null) => void;
  setPreviewHealthIssue: (v: string | null) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<'preview' | 'generation'>>;
  iframeRef: React.MutableRefObject<HTMLIFrameElement | null>;
  sandboxData: SandboxData | null;
  searchParams: URLSearchParams;
  latestSandboxDataRef: React.MutableRefObject<SandboxData | null>;
  attachE2bSandbox: (targetSandboxId: string, options?: { forceReconnect?: boolean }) => Promise<void>;
  requestAutoRestorePreferredProject: (preferredProjectId?: string | null) => string | null;
  createSandbox: (options?: boolean | {
    fromHomeScreen?: boolean;
    skipInitialFileFetch?: boolean;
    preserveProjectContext?: boolean;
    preserveCloudSelectionId?: string;
  }) => Promise<unknown>;
}

export async function reloadPreview(deps: ReloadPreviewDeps): Promise<void> {
  const {
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
    attachE2bSandbox,
    requestAutoRestorePreferredProject,
    createSandbox,
  } = deps;

  latestPreviewErrorRef.current = null;
  lastPreviewErrorTextRef.current = '';
  lastPreviewErrorAtRef.current = 0;
  setPreviewError(null);
  setPreviewHealthIssue(null);
  setActiveTab('preview');

  // Restart the Vite dev server first so a dead/crashed server comes back up,
  // then refresh the iframe with a cache-busting URL.
  if (sandboxData?.sandboxId) {
    try {
      const restartResult = await apiRestartPreview(sandboxData.sandboxId);
      if (!restartResult.ok || !restartResult.data.success) {
        const message = restartResult.ok
          ? restartResult.data.message || 'Preview server failed to restart.'
          : restartResult.error || 'Preview server failed to restart.';
        setPreviewHealthIssue(message);
        return;
      }
    } catch {
      setPreviewHealthIssue('Network error while restarting the preview server.');
      return;
    }
  }

  if (iframeRef.current && sandboxData?.url) {
    const newSrc = `${sandboxData.url}?t=${Date.now()}&manual=true`;
    iframeRef.current.src = newSrc;
    return;
  }

  const sandboxFromUrl = searchParams.get('sandbox')?.trim() || '';
  // Prefer the live session tracker over potentially stale sandboxData.
  const currentSessionId = getCurrentSandboxId();
  const targetSandboxId = currentSessionId || sandboxFromUrl || sandboxData?.sandboxId || '';

  if (targetSandboxId) {
    // Guard: don't try to reattach a stale ID
    if (assertCurrentSandboxIdStrict(targetSandboxId, 'reloadPreview')) {
      await attachE2bSandbox(targetSandboxId, { forceReconnect: true });
    }
    if (iframeRef.current && latestSandboxDataRef.current?.url) {
      iframeRef.current.src = `${latestSandboxDataRef.current.url}?t=${Date.now()}&manual=true&reattach=1`;
    }
    return;
  }

  requestAutoRestorePreferredProject();
  await createSandbox({
    fromHomeScreen: true,
    preserveProjectContext: true,
  });
}

export interface InstallPackagesDeps {
  sandboxData: SandboxData | null;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
}

async function installPackages(
  packages: string[],
  deps: InstallPackagesDeps
): Promise<void> {
  const { sandboxData, addChatMessage } = deps;

  if (!sandboxData) {
    addChatMessage('No active sandbox. Create a sandbox first!', 'system');
    return;
  }

  try {
    const response = await apiInstallPackages(sandboxData.sandboxId, packages);

    if (!response.ok) {
      throw new Error(`Failed to install packages: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case 'command':
                if (!data.command.includes('npm install')) {
                  addChatMessage(data.command, 'command', { commandType: 'input' });
                }
                break;
              case 'output':
                addChatMessage(data.message, 'command', { commandType: 'output' });
                break;
              case 'error':
                if (data.message && data.message !== 'undefined') {
                  addChatMessage(data.message, 'command', { commandType: 'error' });
                }
                break;
              case 'warning':
                addChatMessage(data.message, 'command', { commandType: 'output' });
                break;
              case 'success':
                addChatMessage(`${data.message}`, 'system');
                break;
              case 'status':
                addChatMessage(data.message, 'system');
                break;
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
            addChatMessage('Warning: package install stream parse error, some output may be missing.', 'system');
          }
        }
      }
    }
  } catch (error: unknown) {
    addChatMessage(`Failed to install packages: ${getErrorMessage(error)}`, 'system');
  }
}
