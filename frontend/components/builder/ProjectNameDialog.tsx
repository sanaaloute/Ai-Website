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
import { panelClass, DialogSurfaceDecor } from "./DialogSurfaceDecor";

type ProjectNameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedName: string;
  suggestedSiteTitle?: string;
  onConfirm: (projectName: string, siteTitle: string) => void;
  confirming?: boolean;
  title?: string;
  description?: string;
  confirmButtonLabel?: string;
  confirmingButtonLabel?: string;
};

export function ProjectNameDialog({
  open,
  onOpenChange,
  suggestedName,
  suggestedSiteTitle = '',
  onConfirm,
  confirming = false,
  title = "Name this project",
  description = "Confirm a project name before first save. This name is reused for Supabase, GitHub repo default, and Vercel project default.",
  confirmButtonLabel = "Confirm name",
  confirmingButtonLabel = "Saving…"
}: ProjectNameDialogProps) {
  const cleanSuggestion = (raw: string): string => {
    // Reject JSX/template expressions like {siteConfig.name}
    if (/[{}$]/.test(raw)) return '';
    return raw.trim();
  };

  const safeSuggestedName = cleanSuggestion(suggestedName) || 'My Project';
  const safeSiteTitle = cleanSuggestion(suggestedSiteTitle) || safeSuggestedName;

  const [name, setName] = useState(safeSuggestedName);
  const [siteTitle, setSiteTitle] = useState(safeSiteTitle);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setName(safeSuggestedName);
      setSiteTitle(safeSiteTitle);
      setError(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, safeSuggestedName, safeSiteTitle]);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Project name must be at least 2 characters.");
      return;
    }
    const finalSiteTitle = siteTitle.trim() || trimmed;
    onConfirm(trimmed, finalSiteTitle);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(panelClass, "max-w-md gap-0 p-0")}>
        <DialogSurfaceDecor variant="database" />
        <div className="relative z-[1] space-y-4 p-6">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-50">
              {title}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {description}
            </DialogDescription>
          </DialogHeader>

          <label className="block text-xs font-medium text-zinc-400">
            Project name
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={safeSuggestedName}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-glow-cyan/50"
              autoComplete="off"
              maxLength={100}
              autoFocus
            />
          </label>
          <label className="block text-xs font-medium text-zinc-400">
            Website title
            <input
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              placeholder={name || suggestedName}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-glow-cyan/50"
              autoComplete="off"
              maxLength={100}
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={confirming}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="rounded-xl bg-gradient-to-r from-primary to-primary-soft px-4 py-2 text-sm font-semibold text-white shadow-soft-glow transition hover:opacity-95 disabled:opacity-50"
            >
              {confirming ? confirmingButtonLabel : confirmButtonLabel}
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
