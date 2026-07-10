"use client";

import { useCallback, useState } from "react";
import { generateFilePlan, type FilePlan } from "@/lib/api/client";

export function useFilePlan() {
  const [loading, setLoading] = useState(false);
  const [filePlan, setFilePlan] = useState<FilePlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (params: {
      spec: Record<string, unknown>;
      blueprint: Record<string, unknown>;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await generateFilePlan(params);
        if (!result.ok) {
          setError(result.error || "Failed to generate file plan.");
          setFilePlan(null);
          return null;
        }
        setFilePlan(result.data);
        return result.data;
      } catch {
        setError("Network error generating file plan.");
        setFilePlan(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setFilePlan(null);
    setError(null);
  }, []);

  return { loading, filePlan, error, generate, reset };
}
