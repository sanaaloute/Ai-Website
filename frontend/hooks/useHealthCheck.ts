"use client";

import { useCallback, useState } from "react";
import { healthCheck, liveCheck, readyCheck } from "@/lib/api/client";

export interface HealthStatus {
  status: string;
  version?: string;
  redis?: boolean;
}

export function useHealthCheck() {
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await healthCheck();
      if (!result.ok) {
        setError(result.error || "Health check failed.");
        setHealth(null);
        return null;
      }
      setHealth(result.data);
      return result.data;
    } catch {
      setError("Network error during health check.");
      setHealth(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkLive = useCallback(async () => {
    try {
      const result = await liveCheck();
      return result.ok ? result.data : null;
    } catch {
      return null;
    }
  }, []);

  const checkReady = useCallback(async () => {
    try {
      const result = await readyCheck();
      return result.ok ? result.data : null;
    } catch {
      return null;
    }
  }, []);

  return { loading, health, error, checkHealth, checkLive, checkReady };
}
