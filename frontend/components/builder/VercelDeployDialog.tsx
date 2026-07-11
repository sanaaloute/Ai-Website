"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/shadcn/dialog";
import { cn } from "@/utils/cn";
import { checkVercelDomain } from "@/lib/api/client";
import { panelClass, DialogSurfaceDecor } from "./DialogSurfaceDecor";

export type VercelDeployDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  existingDomainUrl?: string | null;
  existingAppUuid?: string | null;
  projectId?: string | null;
  onConfirmDeploy: (customDomain: string) => void | Promise<void>;
  deploying?: boolean;
  /** Result of the last deploy attempt. */
  result?: { type: 'success' | 'error'; message: string } | null;
  /** Called when the user dismisses the result view. */
  onClearResult?: () => void;
};

export function VercelDeployDialog({
  open,
  onOpenChange,
  projectName,
  existingDomainUrl,
  existingAppUuid,
  projectId,
  onConfirmDeploy,
  deploying = false,
  result,
  onClearResult,
}: VercelDeployDialogProps) {
  const [domain, setDomain] = useState("");
  const protocol = "https://" as const;
  const [domainCheck, setDomainCheck] = useState<{
    available?: boolean;
    message?: string;
    checking?: boolean;
  }>({});
  const isUpdate = !!existingAppUuid;
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existingDomainUrl) {
      setDomain(existingDomainUrl.replace(/^https?:\/\//, ""));
    } else {
      const dnsSafe = projectName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/^-+|-+$/g, "");
      setDomain(`${dnsSafe}.vercel.app`);
    }
    setDomainCheck({});
  }, [open, projectName, existingDomainUrl]);

  const checkDomain = useCallback(async (value: string) => {
    const trimmed = value.trim().toLowerCase().replace(/^https?:\/\//, "");
    if (!trimmed || !projectId || isUpdate) {
      setDomainCheck({});
      return;
    }
    setDomainCheck({ checking: true });
    try {
      const fullDomain = `https://${trimmed}`;
      const result = await checkVercelDomain(fullDomain, projectId);
      if (!result.ok) {
        setDomainCheck({});
        return;
      }
      if (result.data.success) {
        setDomainCheck({
          available: result.data.available,
          message: result.data.message,
        });
      } else {
        setDomainCheck({ available: false, message: result.data.message || 'Check failed' });
      }
    } catch {
      setDomainCheck({});
    }
  }, [projectId, isUpdate]);

  const handleDomainChange = (value: string) => {
    setDomain(value);
    setDomainCheck({ checking: true });
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => checkDomain(value), 600);
  };

  const handleDeploy = () => {
    const raw = domain.trim().toLowerCase();
    if (!raw) return;
    if (!isUpdate && domainCheck.available === false) return;
    const withoutProtocol = raw.replace(/^https?:\/\//, "");
    void onConfirmDeploy(`${protocol}${withoutProtocol}`);
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
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/25 to-teal-600/10 font-mono text-sm font-bold text-cyan-200">
                VC
              </span>
              <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-50">
                {isUpdate ? "Update Vercel Deploy" : "Deploy to Vercel"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-zinc-400">
              {isUpdate
                ? `This project is already deployed. Updating will redeploy the existing app with your latest code and domain settings.`
                : `Choose a custom domain for your deployment. It will be served over HTTPS.`}
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
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-400">
                <span className="flex items-center gap-2">
                  Custom domain
                  {!isUpdate && domainCheck.checking && (
                    <span className="text-[10px] text-zinc-500">checking…</span>
                  )}
                  {!isUpdate && domainCheck.available === true && (
                    <span className="text-[10px] text-emerald-400">✓ available</span>
                  )}
                  {!isUpdate && domainCheck.available === false && (
                    <span className="text-[10px] text-red-400">✗ taken</span>
                  )}
                </span>
                <input
                  value={domain}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  placeholder="my-app.vercel.app"
                  className={`mt-1 w-full rounded-xl border bg-white/5 px-3 py-2 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-glow-cyan/50 ${
                    !isUpdate && domainCheck.available === false
                      ? 'border-red-400/50'
                      : !isUpdate && domainCheck.available === true
                        ? 'border-emerald-400/50'
                        : 'border-white/10'
                  }`}
                  autoComplete="off"
                  disabled={deploying}
                />
                {!isUpdate && domainCheck.available === false && domainCheck.message && (
                  <p className="mt-1 text-xs text-red-400">{domainCheck.message}</p>
                )}
              </label>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-xs font-medium text-zinc-500">Complete URL</p>
                <p className="mt-0.5 font-mono text-sm text-zinc-300">
                  {protocol}{domain.trim().toLowerCase().replace(/^https?:\/\//, "") || "—"}
                </p>
              </div>
              {isUpdate && existingDomainUrl && (
                <p className="text-xs text-cyan-400">
                  Current domain: {existingDomainUrl}
                </p>
              )}
              <DialogFooter className="gap-2 sm:gap-2">
                <button
                  type="button"
                  onClick={handleCloseDialog}
                  disabled={deploying}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deploying || !domain.trim() || (!isUpdate && domainCheck.available === false)}
                  onClick={() => void handleDeploy()}
                  className="rounded-xl bg-gradient-to-r from-primary to-primary-soft px-4 py-2 text-sm font-semibold text-white shadow-soft-glow transition hover:opacity-95 disabled:opacity-50"
                >
                  {deploying
                    ? isUpdate
                      ? "Redeploying…"
                      : "Deploying…"
                    : isUpdate
                      ? "Redeploy"
                      : "Deploy"}
                </button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
