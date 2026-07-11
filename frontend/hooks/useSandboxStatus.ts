import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import { getSandboxStatus } from '@/lib/api/client';
import { setLastCreatedSandbox } from '@/lib/sandbox/sandboxClientSession';

export interface UseSandboxStatusDeps {
  sandboxData: SandboxData | null;
  setSandboxData: (data: SandboxData | null) => void;
  updateStatus: (text: string, active: boolean) => void;
  onSandboxDeadRef?: MutableRefObject<(() => void) | undefined>;
  /** Ref to the latest sandbox data so stale callbacks always read the current ID. */
  latestSandboxDataRef?: MutableRefObject<SandboxData | null>;
}

export function useSandboxStatus(deps: UseSandboxStatusDeps) {
  const { sandboxData, setSandboxData, updateStatus, onSandboxDeadRef, latestSandboxDataRef } = deps;

  const checkSandboxStatus = useCallback(async () => {
    // Read from ref at call time to avoid stale closures after sandbox swaps.
    const sandboxId = latestSandboxDataRef?.current?.sandboxId ?? sandboxData?.sandboxId;
    if (!sandboxId) return;

    // Abort the status check if the backend or E2B is unreachable so the UI
    // can recover instead of waiting for the default 60s HTTP timeout.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    try {
      const result = await getSandboxStatus(sandboxId, controller.signal);
      clearTimeout(timeoutId);

      if (result.ok && result.data.active && result.data.healthy && result.data.sandboxData) {
        const returnedSandboxId = result.data.sandboxData.sandboxId;
        setSandboxData(result.data.sandboxData);
        setLastCreatedSandbox(result.data.sandboxData);
        updateStatus('Sandbox active', true);

        // If the backend renewed the sandbox in the background, the returned ID
        // will be different from the one we asked about. Update the URL so the
        // browser always reflects the currently active sandbox.
        if (
          returnedSandboxId &&
          returnedSandboxId !== sandboxId &&
          typeof window !== 'undefined'
        ) {
          const params = new URLSearchParams(window.location.search);
          params.set('sandbox', returnedSandboxId);
          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}?${params.toString()}`,
          );
        }
        return;
      }

      // Any failed response (503, 500, network error, etc.) or an explicit
      // active:false means the sandbox is unreachable. Trigger auto-recovery.
      const isDead = !result.ok || (result.ok && !result.data.active);

      if (isDead) {
        const httpStatus = result.ok ? 200 : result.status;
        const errorMsg = result.ok ? undefined : result.error;
        console.warn(`[checkSandboxStatus] Sandbox ${sandboxId} is dead (HTTP ${httpStatus}):`, errorMsg);
        setSandboxData(null);
        updateStatus('Sandbox expired — create a new one', false);
        onSandboxDeadRef?.current?.();
        return;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const msg = error instanceof Error ? error.message : 'Status check failed';
      console.error('Failed to check sandbox status:', error);
      updateStatus(`Status check failed: ${msg}`, false);
      // Treat an aborted/timeouted status check as a dead sandbox so recovery
      // can kick in when the network or E2B is hung.
      if (error instanceof DOMException && error.name === 'AbortError') {
        setSandboxData(null);
        updateStatus('Sandbox unreachable — create a new one', false);
        onSandboxDeadRef?.current?.();
      }
    }
  }, [sandboxData, setSandboxData, updateStatus, onSandboxDeadRef, latestSandboxDataRef]);

  return { checkSandboxStatus };
}
