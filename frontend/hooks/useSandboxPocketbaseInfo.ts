'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSandboxPocketbaseInfo } from '@/lib/api/client';

export interface SandboxPocketbaseInfo {
  url: string | null;
  adminUrl: string | null;
  adminEmail: string | null;
  adminPassword: string | null;
  available: boolean;
  message?: string;
}

export function useSandboxPocketbaseInfo(sandboxId: string | null | undefined) {
  const [info, setInfo] = useState<SandboxPocketbaseInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    if (!sandboxId) {
      setInfo(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getSandboxPocketbaseInfo(sandboxId);
      if (!result.ok) {
        throw new Error(result.error);
      }
      setInfo({
        url: result.data.url,
        adminUrl: result.data.adminUrl,
        adminEmail: result.data.adminEmail,
        adminPassword: result.data.adminPassword,
        available: !!result.data.url,
        message: result.data.message,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, [sandboxId]);

  // Auto-fetch when sandboxId becomes available; fetchInfo sets state after
  // the async call resolves.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchInfo();
  }, [fetchInfo]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    info,
    loading,
    error,
    refetch: fetchInfo,
  };
}
