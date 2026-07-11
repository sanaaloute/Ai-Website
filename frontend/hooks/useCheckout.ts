"use client";

import { useCallback, useState } from "react";
import { createCheckoutSession, syncCheckoutSession } from "@/lib/api/client";

export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = useCallback(
    async (params: {
      priceId: string;
      billingMode?: string;
      successUrl: string;
      cancelUrl: string;
    }): Promise<string | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await createCheckoutSession({
          ...params,
          billingMode: params.billingMode ?? 'subscription',
        });
        if (!result.ok) {
          setError(result.error || "Failed to create checkout session.");
          return null;
        }
        return result.data.url;
      } catch {
        setError("Network error creating checkout session.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const syncSession = useCallback(async (sessionId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await syncCheckoutSession({ sessionId });
      if (!result.ok) {
        setError(result.error || "Failed to sync checkout session.");
        return false;
      }
      return result.data.ok;
    } catch {
      setError("Network error syncing checkout session.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, checkout, syncSession };
}
