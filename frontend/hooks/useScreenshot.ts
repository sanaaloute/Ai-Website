"use client";

import { useCallback, useState } from "react";
import { getScreenshot } from "@/lib/api/client";

export function useScreenshot() {
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async (url: string): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await getScreenshot(url);
      if (!result.ok) {
        setError(result.error || "Failed to capture screenshot.");
        return null;
      }
      const blob = result.data;
      const objectUrl = URL.createObjectURL(blob);
      setBlobUrl(objectUrl);
      return objectUrl;
    } catch {
      setError("Network error capturing screenshot.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const revoke = useCallback(() => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
  }, [blobUrl]);

  return { loading, blobUrl, error, capture, revoke };
}
