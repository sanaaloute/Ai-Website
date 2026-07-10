"use client";

import { useCallback, useState } from "react";
import { generateUiUxBlueprint, type UiUxBlueprint } from "@/lib/api/client";

export function useUiUxBlueprint() {
  const [loading, setLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<UiUxBlueprint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (spec: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateUiUxBlueprint({ spec });
      if (!result.ok) {
        setError(result.error || "Failed to generate blueprint.");
        setBlueprint(null);
        return null;
      }
      setBlueprint(result.data);
      return result.data;
    } catch {
      setError("Network error generating blueprint.");
      setBlueprint(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setBlueprint(null);
    setError(null);
  }, []);

  return { loading, blueprint, error, generate, reset };
}
