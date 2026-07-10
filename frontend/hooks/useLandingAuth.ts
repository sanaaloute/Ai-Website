"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  getCurrentUser,
  onAuthStateChange,
  startAuthPolling,
  type AuthUser,
} from "@/lib/auth/backendAuth";
import { useLandingAuthStore } from "@/stores/landingAuthStore";

async function loadNavbarProfile(): Promise<{
  avatarUrl: string | null;
  displayName: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { avatarUrl: null, displayName: "Profile" };
  }

  const url = user.avatarUrl?.trim() || null;
  const displayName =
    user.fullName?.trim() ||
    user.email?.split("@")[0]?.trim() ||
    "Profile";

  return { avatarUrl: url || null, displayName };
}

export function useLandingAuth() {
  const pathname = usePathname();

  const setIsAuthenticated = useLandingAuthStore((s) => s.setIsAuthenticated);
  const setAuthChecked = useLandingAuthStore((s) => s.setAuthChecked);
  const setProfile = useLandingAuthStore((s) => s.setProfile);
  const resetProfile = useLandingAuthStore((s) => s.resetProfile);
  const isAuthenticated = useLandingAuthStore((s) => s.isAuthenticated);

  // Initial auth sync + listener
  useEffect(() => {
    let mounted = true;

    const sync = async () => {
      const user = await getCurrentUser();
      if (!mounted) return;

      const authed = Boolean(user);
      setIsAuthenticated(authed);
      setAuthChecked(true);

      if (authed) {
        const p = await loadNavbarProfile();
        if (mounted) setProfile(p.avatarUrl, p.displayName);
      } else {
        resetProfile();
      }
    };

    void sync();

    const unsubscribe = onAuthStateChange((user: AuthUser | null) => {
      if (!mounted) return;
      const authed = Boolean(user);
      setIsAuthenticated(authed);
      setAuthChecked(true);
      if (authed) {
        void loadNavbarProfile().then((p) => {
          if (mounted) setProfile(p.avatarUrl, p.displayName);
        });
      } else {
        resetProfile();
      }
    });

    // Fallback polling in case backend auth changes in another tab
    const poller = startAuthPolling(30000);

    return () => {
      mounted = false;
      unsubscribe();
      poller.stop();
    };
  }, [setIsAuthenticated, setAuthChecked, setProfile, resetProfile]);

  // Refresh profile on pathname change (e.g. back from /profile)
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    void (async () => {
      const p = await loadNavbarProfile();
      if (!cancelled) setProfile(p.avatarUrl, p.displayName);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, isAuthenticated, setProfile]);
}
