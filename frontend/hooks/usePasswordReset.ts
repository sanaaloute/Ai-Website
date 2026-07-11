"use client";

import { useCallback, useState } from "react";
import { requestPasswordReset } from "@/lib/api/client";

export function usePasswordReset() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(async (email: string, redirectTo?: string) => {
    setLoading(true);
    setError(null);
    setSent(false);
    try {
      const result = await requestPasswordReset({ email, redirectTo });
      if (!result.ok) {
        setError(result.error || "Failed to send password reset email.");
        return false;
      }
      setSent(true);
      return true;
    } catch {
      setError("Network error sending password reset email.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, sent, error, reset };
}
