import { useCallback } from 'react';
import type { SandboxData } from './useWorkspaceSandbox';
import { previewHealth } from '@/lib/api/client';

export interface PreviewHealthDeps {
  latestSandboxDataRef: React.MutableRefObject<SandboxData | null>;
  latestPreviewErrorRef: React.MutableRefObject<string | null>;
  lastPreviewReadyAtRef: React.MutableRefObject<number>;
  lastPreviewIframeLoadAtRef: React.MutableRefObject<number>;
  lastPreviewErrorAtRef: React.MutableRefObject<number>;
}

export function usePreviewHealth(deps: PreviewHealthDeps) {
  const {
    latestSandboxDataRef,
    latestPreviewErrorRef,
    lastPreviewReadyAtRef,
    lastPreviewIframeLoadAtRef,
    lastPreviewErrorAtRef,
  } = deps;

  const probePreviewHealth = useCallback(
    async (
      reason: 'restore' | 'apply' | 'reload',
      timeoutMs = 3500
    ): Promise<{
      reachable: boolean;
      active: boolean;
      diagnostics?: string;
      statusCode?: number;
    }> => {
      try {
        const result = await previewHealth({
          sandboxId: latestSandboxDataRef.current?.sandboxId ?? '',
          previewUrl: latestSandboxDataRef.current?.url ?? '',
          timeoutMs,
        });

        if (!result.ok) {
          return { reachable: false, active: true };
        }

        return {
          reachable: Boolean(result.data.reachable),
          active: Boolean(result.data.active),
          diagnostics: typeof result.data.diagnostics === 'string' ? result.data.diagnostics : undefined,
          statusCode: typeof result.data.statusCode === 'number' ? result.data.statusCode : undefined,
        };
      } catch {
        return { reachable: false, active: true };
      }
    },
    [latestSandboxDataRef]
  );

  const waitForPreviewHealthy = useCallback(async (timeoutMs = 15000): Promise<boolean> => {
    const baselineReadyAt = lastPreviewReadyAtRef.current;
    const baselineIframeLoadAt = lastPreviewIframeLoadAtRef.current;
    const baselineErrorAt = lastPreviewErrorAtRef.current;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (latestPreviewErrorRef.current && lastPreviewErrorAtRef.current > baselineErrorAt) {
        return false;
      }
      if (lastPreviewReadyAtRef.current > baselineReadyAt) {
        return true;
      }
      if (lastPreviewIframeLoadAtRef.current > baselineIframeLoadAt) {
        return true;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    }
    return false;
  }, [latestPreviewErrorRef, lastPreviewReadyAtRef, lastPreviewIframeLoadAtRef, lastPreviewErrorAtRef]);

  return { probePreviewHealth, waitForPreviewHealthy };
}
