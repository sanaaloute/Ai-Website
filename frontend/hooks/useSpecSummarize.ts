"use client";

import { useCallback, useState } from "react";
import { summarizeSpec, type ProjectSpec } from "@/lib/api/client";

export function useSpecSummarize() {
  const [loading, setLoading] = useState(false);
  const [spec, setSpec] = useState<ProjectSpec | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summarize = useCallback(async (prompt: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await summarizeSpec({ prompt });
      if (!result.ok) {
        setError(result.error || "Failed to summarize spec.");
        setSpec(null);
        return null;
      }
      setSpec(result.data);
      return result.data;
    } catch {
      setError("Network error summarizing spec.");
      setSpec(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSpec(null);
    setError(null);
  }, []);

  return { loading, spec, error, summarize, reset };
}
