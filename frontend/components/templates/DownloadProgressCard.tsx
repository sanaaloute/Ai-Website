"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Square,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  FolderArchive,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { DownloadStatus } from "@/hooks/useTemplateDownload";

type Props = {
  status: DownloadStatus;
  repoName: string;
  errorMessage: string | null;
  isActive: boolean;
  onAbort: () => void;
  onDismiss: () => void;
};

function statusConfig(status: DownloadStatus, t: (key: string) => string) {
  switch (status) {
    case "cloning":
      return {
        icon: Loader2,
        iconClass: "text-glow-cyan animate-spin",
        title: t("cloningTitle"),
        description: t("cloningDesc"),
        barColor: "bg-glow-cyan",
        barWidth: "w-1/3",
        pulse: true,
      };
    case "downloading":
      return {
        icon: Download,
        iconClass: "text-glow-cyan animate-bounce",
        title: t("preparingTitle"),
        description: t("preparingDesc"),
        barColor: "bg-glow-cyan",
        barWidth: "w-2/3",
        pulse: true,
      };
    case "completed":
      return {
        icon: CheckCircle2,
        iconClass: "text-emerald-400",
        title: t("completedTitle"),
        description: t("completedDesc"),
        barColor: "bg-emerald-400",
        barWidth: "w-full",
        pulse: false,
      };
    case "error":
      return {
        icon: AlertCircle,
        iconClass: "text-red-400",
        title: t("failedTitle"),
        description: t("failedDesc"),
        barColor: "bg-red-400",
        barWidth: "w-full",
        pulse: false,
      };
    case "aborted":
      return {
        icon: Square,
        iconClass: "text-amber-400",
        title: t("abortedTitle"),
        description: t("abortedDesc"),
        barColor: "bg-amber-400",
        barWidth: "w-full",
        pulse: false,
      };
    default:
      return {
        icon: FolderArchive,
        iconClass: "text-zinc-400",
        title: "",
        description: "",
        barColor: "bg-zinc-400",
        barWidth: "w-0",
        pulse: false,
      };
  }
}

export default function DownloadProgressCard({
  status,
  repoName,
  errorMessage,
  isActive,
  onAbort,
  onDismiss,
}: Props) {
  const t = useTranslations("templates");
  const config = statusConfig(status, t);
  const Icon = config.icon;
  const [progress, setProgress] = useState(0);

  // Simulate progress bar animation
  useEffect(() => {
    if (status === "cloning") setProgress(33);
    else if (status === "downloading") setProgress(66);
    else if (status === "completed" || status === "error" || status === "aborted")
      setProgress(100);
    else setProgress(0);
  }, [status]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 60, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 60, scale: 0.95 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed right-4 top-20 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-background/95 shadow-[0_0_60px_rgba(15,23,42,0.95)] backdrop-blur-2xl sm:right-6 sm:top-24 sm:w-80"
      >
          {/* Progress bar */}
          <div className="h-0.5 w-full bg-white/5">
            <motion.div
              className={`h-full ${config.barColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>

          <div className="p-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 ${
                  config.pulse ? "ring-1 ring-glow-cyan/20" : ""
                }`}
              >
                <Icon size={18} className={config.iconClass} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  {config.title}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {config.description}
                </p>
                {repoName && (
                  <p className="mt-1 truncate text-[11px] font-medium text-glow-cyan/80">
                    ai-website-{repoName}.zip
                  </p>
                )}
                {errorMessage && (
                  <p className="mt-1.5 text-xs leading-snug text-red-300">
                    {errorMessage}
                  </p>
                )}
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={onDismiss}
                className="shrink-0 rounded-lg p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white"
                aria-label={t("dismiss")}
              >
                <X size={14} />
              </button>
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center justify-end gap-2">
              {isActive && (
                <button
                  type="button"
                  onClick={onAbort}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
                >
                  <Square size={10} className="fill-current" aria-hidden />
                  {t("abort")}
                </button>
              )}
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
              >
                <X size={10} aria-hidden />
                {t("dismiss")}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
  );
}
