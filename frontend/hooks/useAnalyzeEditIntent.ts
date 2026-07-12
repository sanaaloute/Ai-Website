"use client";

import { useCallback, useState } from "react";
import { analyzeEditIntent, extractPlanLimitError, type SearchPlan } from "@/lib/api/client";
import { useEntitlementsStore } from "@/stores/entitlementsStore";

export function useAnalyzeEditIntent() {
  const [loading, setLoading] = useState(false);
  const [searchPlan, setSearchPlan] = useState<SearchPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (params: {
      prompt: string;
      manifest: {
        files: Record<string, unknown>;
        routes: string[];
        componentTree: Record<string, unknown>;
      };
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await analyzeEditIntent(params);
        if (!result.ok) {
          const planLimit = extractPlanLimitError(result);
          if (planLimit) {
            useEntitlementsStore.getState().openUpgradeDialog(planLimit);
          }
          setError(result.error || "Failed to analyze edit intent.");
          setSearchPlan(null);
          return null;
        }
        setSearchPlan(result.data.search_plan);
        return result.data.search_plan;
      } catch {
        setError("Network error analyzing edit intent.");
        setSearchPlan(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setSearchPlan(null);
    setError(null);
  }, []);

  return { analyze, reset, loading, searchPlan, error };
}
