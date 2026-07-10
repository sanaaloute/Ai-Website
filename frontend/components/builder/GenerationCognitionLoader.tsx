"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/utils/cn";
import { StepIndicators, type AppLoaderStep } from "@/components/shared/AppLoader";

type OrbSize = "xs" | "sm" | "md" | "lg";

const orbSizeClass: Record<OrbSize, string> = {
  xs: "h-12 w-12",
  sm: "h-28 w-28",
  md: "h-40 w-40",
  lg: "h-52 w-52"
};

/** Concentric rings + core — use inside loaders or overlays.
 * @param orbitSpeed — Rotation speed multiplier: `1` matches the original timings; higher = faster (e.g. `1.5` is 50% faster). Clamped ≥ 0.5. Default `1.35` for a slightly snappier feel. */
export function GenerationOrb({
  size = "md",
  className,
  orbitSpeed = 1.35
}: {
  size?: OrbSize;
  className?: string;
  orbitSpeed?: number;
}) {
  const s = Math.max(0.5, orbitSpeed);
  return (
    <div className={cn("relative flex items-center justify-center", orbSizeClass[size], className)}>
      <div
        className="pointer-events-none absolute inset-[-40%] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(167, 139, 250, 0.45), transparent 55%), radial-gradient(circle at 70% 70%, rgba(34, 211, 238, 0.35), transparent 50%)"
        }}
      />

      <motion.div
        className="absolute inset-0 rounded-full border border-white/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 28 / s, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-[10%] rounded-full border-2 border-transparent"
        style={{
          borderTopColor: "rgba(34, 211, 238, 0.65)",
          borderRightColor: "rgba(124, 58, 237, 0.35)"
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 14 / s, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-[22%] rounded-full border border-glow-purple/40"
        animate={{ rotate: 360 }}
        transition={{ duration: 9 / s, repeat: Infinity, ease: "linear" }}
      />

      <div className="absolute inset-[28%] rounded-full bg-gradient-to-br from-primary/25 via-background-soft/90 to-primary-soft/20 shadow-[inset_0_0_30px_rgba(34,211,238,0.15)]" />

      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Sparkles
          className="text-glow-cyan drop-shadow-[0_0_14px_rgba(34,211,238,0.85)]"
          strokeWidth={1.25}
          size={size === "lg" ? 44 : size === "md" ? 36 : size === "sm" ? 28 : 18}
        />
      </motion.div>
    </div>
  );
}

type GenerationCognitionLoaderProps = {
  title?: string;
  subtitle?: string;
  statusLine?: string;
  progress?: number;
  autoProgress?: boolean;
  autoProgressIntervalMs?: number;
  autoProgressStep?: number;
  taskId?: string;
  className?: string;
  orbSize?: OrbSize;
  taskType?: "analysis" | "workspace" | "data" | "preview";
  /** Passed to {@link GenerationOrb} — higher = faster ring rotation. */
  orbitSpeed?: number;
  steps?: AppLoaderStep[];
  activeStep?: number;
};

/** Centered hero state: “analyzing” before any file stream. */
export function GenerationCognitionLoader({
  title = "Synthesizing your build",
  subtitle,
  statusLine,
  progress,
  autoProgress = false,
  autoProgressIntervalMs = 1000,
  autoProgressStep = 1,
  taskId,
  className,
  orbSize = "lg",
  taskType = "analysis",
  orbitSpeed,
  steps,
  activeStep = 0,
}: GenerationCognitionLoaderProps) {
  const [autoValue, setAutoValue] = useState(0);
  const resolvedTaskId = taskId ?? `${title}::${subtitle ?? ""}::${statusLine ?? ""}`;

  useEffect(() => {
    if (!autoProgress || typeof progress === "number") return;
    setAutoValue(0);
  }, [autoProgress, progress, resolvedTaskId]);

  useEffect(() => {
    if (!autoProgress || typeof progress === "number") return;
    const step = Math.max(1, Math.round(autoProgressStep));
    const intervalMs = Math.max(150, Math.round(autoProgressIntervalMs));
    const timer = window.setInterval(() => {
      setAutoValue((prev) => Math.min(100, prev + step));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [autoProgress, progress, autoProgressIntervalMs, autoProgressStep, resolvedTaskId]);

  const clampedProgress =
    typeof progress === "number" && Number.isFinite(progress)
      ? Math.max(0, Math.min(100, Math.round(progress)))
      : autoProgress
        ? autoValue
        : undefined;
  const resolvedSpeed = orbitSpeed ?? (taskType === "data" ? 1.8 : taskType === "workspace" ? 1.55 : 1.35);

  return (
    <div
      className={cn(
        "flex min-h-[min(60vh,420px)] flex-col items-center justify-center gap-10 px-6 py-12",
        className
      )}
    >
      <GenerationOrb size={orbSize} orbitSpeed={resolvedSpeed} />

      <div className="max-w-lg text-center">
        <motion.h3
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="bg-gradient-to-r from-zinc-100 via-glow-cyan/90 to-glow-purple bg-clip-text text-xl font-semibold tracking-tight text-transparent sm:text-2xl"
        >
          {title}
        </motion.h3>
        {subtitle ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mt-3 text-sm text-zinc-400"
          >
            {subtitle}
          </motion.p>
        ) : null}
        {statusLine ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="mt-2 text-xs text-zinc-500"
          >
            {statusLine}
          </motion.p>
        ) : null}
        {clampedProgress !== undefined && !steps ? (
          <div className="mx-auto mt-4 w-full max-w-sm">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full bg-gradient-to-r from-glow-purple via-glow-cyan to-glow-purple"
                initial={{ width: 0 }}
                animate={{ width: `${clampedProgress}%` }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
            </div>
            <p className="mt-1 text-xs font-medium text-zinc-400">{clampedProgress}% complete</p>
          </div>
        ) : null}
        {steps && steps.length > 0 ? (
          <div className="mx-auto mt-6 w-full max-w-md">
            <StepIndicators steps={steps} activeIndex={activeStep} />
          </div>
        ) : null}
      </div>

      {!steps && (<div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            className="h-1 w-8 rounded-full bg-gradient-to-r from-glow-purple to-glow-cyan"
            initial={{ opacity: 0.2, scaleX: 0.3 }}
            animate={{ opacity: [0.35, 1, 0.35], scaleX: [0.5, 1, 0.5] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.12,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>)}
    </div>
  );
}

type GenerationThinkingStripProps = {
  isThinking: boolean;
  thinkingDuration?: number;
  thinkingText?: string;
  /** Ring speed — same semantics as {@link GenerationOrb}. Default `1.35`. */
  orbitSpeed?: number;
};

/** AI “chain-of-thought” stream during generation — glass panel, cyan accents. */
export function GenerationThinkingStrip({
  isThinking,
  thinkingDuration,
  thinkingText,
  orbitSpeed =  2
}: GenerationThinkingStripProps) {
  const s = Math.max(0.5, orbitSpeed);
  return (
    <div className="border-b border-white/10 bg-gradient-to-b from-primary/10 via-transparent to-transparent px-5 pb-5 pt-4 sm:px-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0">
          <motion.div
            className="absolute inset-0 rounded-full border border-glow-cyan/50"
            animate={{ rotate: 360 }}
            transition={{ duration: 8 / s, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-1 rounded-full border border-t-glow-purple/80 border-transparent"
            animate={{ rotate: -360 }}
            transition={{ duration: 5 / s, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-glow-cyan shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">
            {isThinking ? (
              <span className="bg-gradient-to-r from-glow-cyan to-glow-purple bg-clip-text text-transparent">
                Cognitive pass in progress
              </span>
            ) : (
              <span className="text-emerald-400/95">
                Reasoning complete · {thinkingDuration ?? 0}s
              </span>
            )}
          </p>
          <p className="text-xs text-zinc-500">Model trace (optional)</p>
        </div>
      </div>
      {thinkingText ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60 shadow-[0_0_40px_rgba(124,58,237,0.12)] backdrop-blur-md">
          <div className="border-b border-white/5 bg-white/[0.03] px-4 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-glow-cyan/80">Stream</span>
          </div>
          <pre className="scrollbar-hide max-h-44 overflow-y-auto p-4 font-mono text-xs leading-relaxed text-zinc-300">
            {thinkingText}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

type GenerationPreviewWaitProps = {
  line1: string;
  line2?: string;
};

/** Full-area overlay on preview tab while scraping / generating. */
export function GenerationPreviewWait({ line1, line2 }: GenerationPreviewWaitProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/85 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-50" />
      <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.2] mix-blend-overlay" />
      <div className="relative z-10 flex max-w-md flex-col items-center px-6 text-center">
        <GenerationOrb size="md" />
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-lg font-semibold text-transparent"
        >
          {line1}
        </motion.p>
        {line2 ? (
          <p className="mt-2 text-sm text-zinc-500">{line2}</p>
        ) : null}
      </div>
    </div>
  );
}

type SandboxApplyOverlayProps = {
  stage: "analyzing" | "installing" | "applying";
  packages?: string[];
  installedPackages?: string[];
  filesGenerated?: string[];
  message?: string;
  currentFile?: string;
  deadlineAt?: number;
};

/** Full-screen overlay on live preview while apply-ai-code runs. */
export function SandboxApplyOverlay({
  stage,
  packages,
  installedPackages,
  filesGenerated,
  message,
  currentFile,
  deadlineAt
}: SandboxApplyOverlayProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadlineAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deadlineAt]);

  const steps = [
    { label: 'Analyze', key: 'analyzing' },
    { label: 'Install', key: 'installing' },
    { label: 'Apply', key: 'applying' },
  ];
  const activeStep = stage === 'analyzing' ? 0 : stage === 'installing' ? 1 : 2;

  const title =
    stage === "analyzing"
      ? "Analyzing generated code"
      : stage === "installing"
        ? "Installing packages"
        : "Applying changes";

  const fallbackSubtitle =
    stage === "analyzing"
      ? "Parsing output and resolving dependencies…"
      : stage === "installing"
        ? "npm is installing modules in your sandbox…"
        : "Writing files into your live environment…";
  const subtitle = message || fallbackSubtitle;
  const countdownText = useMemo(() => {
    if (!deadlineAt) return null;
    const remainingMs = Math.max(0, deadlineAt - now);
    const totalSec = Math.ceil(remainingMs / 1000);
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    return `Auto-timeout in ${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }, [deadlineAt, now]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/88 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-45" />
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950/85 p-8 shadow-[0_0_60px_rgba(124,58,237,0.2)]">
        <div className="flex flex-col items-center text-center">
          <GenerationOrb size="md" />
          <h3 className="mt-6 bg-gradient-to-r from-zinc-100 via-glow-cyan/90 to-glow-purple bg-clip-text text-xl font-semibold text-transparent">
            {title}
          </h3>
          <div className="mx-auto mt-4 w-full max-w-xs">
            <StepIndicators steps={steps} activeIndex={activeStep} />
          </div>
          <p className="mt-3 text-sm text-zinc-500">{subtitle}</p>
          {currentFile ? (
            <p className="mt-2 font-mono text-xs text-zinc-400">Current: {currentFile}</p>
          ) : null}
          {countdownText ? (
            <p className="mt-1 text-xs text-zinc-500">{countdownText}</p>
          ) : null}

          {stage === "installing" && packages && packages.length > 0 ? (
            <div className="mt-6 flex max-h-32 flex-wrap justify-center gap-2 overflow-y-auto">
              {packages.map((pkg) => {
                const done = installedPackages?.includes(pkg);
                return (
                  <span
                    key={pkg}
                    className={cn(
                      "rounded-full border px-3 py-1 font-mono text-xs transition-colors",
                      done
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                        : "border-white/15 bg-white/5 text-zinc-400"
                    )}
                  >
                    {pkg}
                    {done ? <span className="ml-1 text-emerald-400">✓</span> : null}
                  </span>
                );
              })}
            </div>
          ) : null}

          {stage === "applying" && filesGenerated && filesGenerated.length > 0 ? (
            <p className="mt-6 text-sm text-zinc-400">
              Creating <span className="text-glow-cyan">{filesGenerated.length}</span> files…
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
