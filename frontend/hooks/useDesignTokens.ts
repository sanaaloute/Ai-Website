"use client";

import { useCallback, useState } from "react";
import { generateDesignTokens, type DesignTokens } from "@/lib/api/client";

export function useDesignTokens() {
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState<DesignTokens | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (spec: { brand: string; vibe: string }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await generateDesignTokens({ spec });
        if (!result.ok) {
          setError(result.error || "Failed to generate design tokens.");
          setTokens(null);
          return null;
        }
        setTokens(result.data);
        return result.data;
      } catch {
        setError("Network error generating design tokens.");
        setTokens(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setTokens(null);
    setError(null);
  }, []);

  return { loading, tokens, error, generate, reset };
}
