"use client";

import { useCallback, useState } from "react";
import { restartPreview } from "@/lib/api/client";

export function useRestartPreview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restart = useCallback(async (sandboxId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await restartPreview(sandboxId);
      if (!result.ok) {
        setError(result.error || "Failed to restart preview.");
        return false;
      }
      return result.data.success;
    } catch {
      setError("Network error restarting preview.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, restart };
}
