"use client";

import { useCallback, useState } from "react";
import { getSandboxLogs, monitorPreviewLogs } from "@/lib/api/client";

export interface PreviewLogError {
  type: string;
  package?: string;
  message: string;
  file?: string;
}

export function useSandboxLogs() {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("");
  const [previewErrors, setPreviewErrors] = useState<PreviewLogError[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (sandboxId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSandboxLogs(sandboxId);
      if (!result.ok) {
        setError(result.error || "Failed to fetch sandbox logs.");
        return;
      }
      setLogs(result.data.logs);
      setStatus(result.data.status);
    } catch {
      setError("Network error fetching sandbox logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPreviewErrors = useCallback(async (sandboxId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await monitorPreviewLogs(sandboxId);
      if (!result.ok) {
        setError(result.error || "Failed to check preview errors.");
        return;
      }
      setPreviewErrors(result.data.errors);
    } catch {
      setError("Network error checking preview errors.");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    logs,
    status,
    previewErrors,
    loading,
    error,
    fetchLogs,
    checkPreviewErrors,
  };
}
