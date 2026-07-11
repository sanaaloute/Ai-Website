"use client";

import { useCallback, useState } from "react";
import { generateComponent, generatePage } from "@/lib/api/client";

export function useCodeGeneration() {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateComponentCode = useCallback(
    async (params: {
      section: { name: string; description: string };
      tokens?: Record<string, string>;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await generateComponent(params);
        if (!result.ok) {
          setError(result.error || "Failed to generate component.");
          setCode(null);
          return null;
        }
        setCode(result.data.code);
        return result.data.code;
      } catch {
        setError("Network error generating component.");
        setCode(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const generatePageCode = useCallback(
    async (params: {
      page: { name: string; route: string };
      sections?: Array<{ name: string; type: string }>;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await generatePage(params);
        if (!result.ok) {
          setError(result.error || "Failed to generate page.");
          setCode(null);
          return null;
        }
        setCode(result.data.code);
        return result.data.code;
      } catch {
        setError("Network error generating page.");
        setCode(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setCode(null);
    setError(null);
  }, []);

  return {
    loading,
    code,
    error,
    generateComponentCode,
    generatePageCode,
    reset,
  };
}
