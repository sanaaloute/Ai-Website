"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/shadcn/dialog";
import { cn } from "@/utils/cn";
import { getGithubStatus } from "@/lib/api/client";
import { backendApiUrl } from "@/lib/api/backendConfig";
import { usePathname } from "@/i18n/navigation";
import { panelClass, DialogSurfaceDecor } from "./DialogSurfaceDecor";

export type GithubPushDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Default repository name (slug), e.g. from project title. */
  defaultRepoName: string;
  /** Called when the user confirms push (GitHub already connected). */
  onConfirmPush: (repoName: string) => void | Promise<void>;
  /** True while the push API request is running. */
  pushing?: boolean;
  /** Result of the last push attempt. */
  result?: { type: 'success' | 'error'; message: string } | null;
  /** Called when the user dismisses the result view. */
  onClearResult?: () => void;
};

/**
 * Push to GitHub: OAuth if needed, otherwise repo name + confirm.
 */
export function GithubPushDialog({
  open,
  onOpenChange,
  defaultRepoName,
  onConfirmPush,
  pushing = false,
  result,
  onClearResult,
}: GithubPushDialogProps) {
  const [statusLoading, setStatusLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [repoName, setRepoName] = useState(defaultRepoName);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setRepoName(defaultRepoName);
      setStatusLoading(true);
      setConnected(null);
    }, 0);
    void getGithubStatus()
      .then((r) => {
        if (r.ok) {
          setConnected(Boolean(r.data.connected));
        } else {
          setConnected(false);
        }
      })
      .catch(() => setConnected(false))
      .finally(() => setStatusLoading(false));
    return () => window.clearTimeout(timer);
  }, [open, defaultRepoName]);

  // Poll GitHub connection status while dialog is open and not yet connected
  useEffect(() => {
    if (!open || connected !== false) return;
    const interval = window.setInterval(() => {
      void getGithubStatus()
        .then((r) => {
          if (r.ok && r.data.connected) {
            setConnected(true);
          }
        })
        .catch(() => { /* ignore polling errors */ });
    }, 2500);
    return () => window.clearInterval(interval);
  }, [open, connected]);

  const connectGithub = () => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    const next = `${pathname}${search}`;
    window.location.href = backendApiUrl(`/api/github/authorize?next=${encodeURIComponent(next)}`);
  };

  const handlePush = () => {
    const name = repoName.trim() || defaultRepoName;
    void onConfirmPush(name);
  };

  const handleCloseResult = () => {
    onClearResult?.();
    onOpenChange(false);
  };

  const handleCloseDialog = () => {
    onClearResult?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogContent className={cn(panelClass, "max-w-md gap-0 p-0")}>
        <DialogSurfaceDecor variant="github" />
        <div className="relative z-[1] space-y-4 p-6">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/25 to-fuchsia-600/10 font-mono text-sm font-bold text-violet-200">
                GH
              </span>
              <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-50">
                Push to GitHub
              </DialogTitle>
            </div>
            <DialogDescription className="text-zinc-400">
              Export your sandbox to a GitHub repository. After connecting once,
              you can create a repo and push from here anytime.
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="space-y-3">
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  result.type === "success"
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                    : "border-red-400/30 bg-red-500/10 text-red-200"
                }`}
              >
                {result.message}
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <button
                  type="button"
                  onClick={handleCloseResult}
                  className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-soft px-4 py-2 text-sm font-semibold text-white shadow-soft-glow transition hover:opacity-95"
                >
                  Close
                </button>
              </DialogFooter>
            </div>
          ) : statusLoading ? (
            <p className="text-sm text-zinc-400">Checking GitHub connection…</p>
          ) : connected === false ? (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-zinc-400">
                Sign in with GitHub to authorize this app to create projects and upload files on your behalf.
              </p>
              <button
                type="button"
                onClick={connectGithub}
                className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-soft px-4 py-3 text-sm font-semibold text-white shadow-soft-glow transition hover:opacity-95"
              >
                Connect to GitHub
              </button>
              <DialogFooter className="gap-2 sm:gap-2">
                <button
                  type="button"
                  onClick={handleCloseDialog}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
                >
                  Cancel
                </button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-400">
                Repository name
                <input
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder={defaultRepoName}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-glow-cyan/50"
                  autoComplete="off"
                  disabled={pushing}
                />
              </label>
              <p className="text-xs text-zinc-500">
                New GitHub repository under your account; use letters, numbers, hyphens. If the name exists, files are
                pushed to that repo.
              </p>
              <DialogFooter className="gap-2 sm:gap-2">
                <button
                  type="button"
                  onClick={handleCloseDialog}
                  disabled={pushing}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
                >
                  Cancel
                </button>
                {connected && (
                  <button
                    type="button"
                    disabled={pushing || !repoName.trim()}
                    onClick={() => void handlePush()}
                    className="rounded-xl bg-gradient-to-r from-primary to-primary-soft px-4 py-2 text-sm font-semibold text-white shadow-soft-glow transition hover:opacity-95 disabled:opacity-50"
                  >
                    {pushing ? "Pushing…" : "Push to GitHub"}
                  </button>
                )}
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
