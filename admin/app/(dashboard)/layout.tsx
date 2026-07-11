"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useSidebarStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { fetchMe, ApiError } from "@/lib/api/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { collapsed } = useSidebarStore();
  const { isAuthenticated, hydrated, logout } = useAuthStore();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  // Validate token on mount by calling /auth/me
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    fetchMe()
      .then((admin) => {
        if (cancelled) return;
        // Optionally sync user data from server
        // eslint-disable-next-line no-console
        console.log("[Auth] Token valid, admin:", admin.full_name);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          // fetchJson already clears the session and redirects to login.
          return;
        }
        // eslint-disable-next-line no-console
        console.error("[Auth] Token validation failed:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, logout, router]);

  // Show loading spinner until auth state is rehydrated from storage
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
      </div>
    );
  }

  // After hydration, if not authenticated, show spinner while redirecting
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main
        className="pt-16 transition-all duration-300 min-h-screen"
        style={{ marginLeft: collapsed ? 80 : 260 }}
      >
        <div className="p-6 max-w-[1600px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
