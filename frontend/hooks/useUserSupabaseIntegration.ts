"use client";

import { useCallback, useState } from "react";
import {
  connectUserSupabase,
  getUserSupabaseStatus,
  disconnectUserSupabase,
} from "@/lib/api/client";

export function useUserSupabaseIntegration() {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(
    async (
      sandboxId: string,
      credentials: { supabaseUrl: string; supabaseAnonKey: string }
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const result = await connectUserSupabase(sandboxId, credentials);
        if (!result.ok) {
          setError(result.error || "Failed to connect Supabase.");
          return false;
        }
        setConnected(true);
        setSupabaseUrl(credentials.supabaseUrl);
        return true;
      } catch {
        setError("Network error connecting Supabase.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const checkStatus = useCallback(async (sandboxId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getUserSupabaseStatus(sandboxId);
      if (!result.ok) {
        setError(result.error || "Failed to check Supabase status.");
        return;
      }
      setConnected(result.data.connected);
      setSupabaseUrl(result.data.supabaseUrl || null);
    } catch {
      setError("Network error checking Supabase status.");
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async (sandboxId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await disconnectUserSupabase(sandboxId);
      if (!result.ok) {
        setError(result.error || "Failed to disconnect Supabase.");
        return false;
      }
      setConnected(false);
      setSupabaseUrl(null);
      return true;
    } catch {
      setError("Network error disconnecting Supabase.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    connected,
    supabaseUrl,
    error,
    connect,
    checkStatus,
    disconnect,
  };
}
