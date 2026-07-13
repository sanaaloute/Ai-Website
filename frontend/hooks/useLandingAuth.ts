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

function navbarProfileFrom(user: AuthUser): {
  avatarUrl: string | null;
  displayName: string;
} {
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

      if (authed && user) {
        const p = navbarProfileFrom(user);
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
      if (authed && user) {
        const p = navbarProfileFrom(user);
        if (mounted) setProfile(p.avatarUrl, p.displayName);
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
      const user = await getCurrentUser();
      if (!user || cancelled) return;
      const p = navbarProfileFrom(user);
      setProfile(p.avatarUrl, p.displayName);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, isAuthenticated, setProfile]);
}
