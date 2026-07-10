"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Boxes, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ */
/*  Animated orb                                                        */
/* ------------------------------------------------------------------ */

export function AppLoaderOrb({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex h-24 w-24 items-center justify-center", className)}>
      <div
        className="pointer-events-none absolute inset-[-30%] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(167,139,250,0.5), transparent 55%), radial-gradient(circle at 70% 70%, rgba(34,211,238,0.4), transparent 50%)",
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border border-white/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-[12%] rounded-full border-2 border-transparent"
        style={{ borderTopColor: "rgba(34,211,238,0.7)", borderRightColor: "rgba(124,58,237,0.4)" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
      <motion.div className="absolute inset-[28%] rounded-full bg-gradient-to-br from-primary/30 via-background-soft/90 to-primary-soft/30" />
      <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
        <Boxes className="h-8 w-8 text-glow-cyan drop-shadow-[0_0_14px_rgba(34,211,238,0.8)]" />
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step indicator row                                                */
/* ------------------------------------------------------------------ */

export type AppLoaderStep = {
  label: string;
  key: string;
};

export function StepIndicators({
  steps,
  activeIndex,
}: {
  steps: AppLoaderStep[];
  activeIndex: number;
}) {
  if (steps.length <= 1) return null;

  return (
    <div className="mt-8 w-full">
      <div className="relative flex w-full justify-between">
        {/* Background track */}
        <div className="absolute left-8 right-8 top-4 h-px bg-zinc-800" />
        {/* Fill track */}
        <motion.div
          className="absolute left-8 right-8 top-4 h-px origin-left bg-cyan-400"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: activeIndex / Math.max(steps.length - 1, 1) }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />

        {steps.map((step, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <div
              key={step.key}
              className="relative z-10 flex w-16 shrink-0 flex-col items-center"
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  isDone
                    ? "bg-emerald-950 text-emerald-400 ring-1 ring-emerald-600"
                    : isActive
                      ? "bg-cyan-950 text-cyan-400 ring-1 ring-cyan-500"
                      : "bg-zinc-800 text-zinc-500 ring-1 ring-zinc-700"
                )}
              >
                {isDone ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span
                className={cn(
                  "mt-2 px-1 text-center text-xs font-medium leading-tight",
                  isActive ? "text-glow-cyan" : isDone ? "text-zinc-400" : "text-zinc-600"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Simple progress bar (when no steps)                               */
/* ------------------------------------------------------------------ */

function SimpleProgress({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className="mx-auto mt-6 w-full max-w-xs">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-glow-purple via-glow-cyan to-glow-purple"
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </div>
      <p className="mt-2 text-lg font-medium text-zinc-400">{clamped}% complete</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main AppLoader                                                    */
/* ------------------------------------------------------------------ */

export type AppLoaderProps = {
  title: string;
  subtitle?: string;
  status?: string;
  steps?: AppLoaderStep[];
  activeStep?: number;
  progress?: number;
  className?: string;
  children?: React.ReactNode;
};

export default function AppLoader({
  title,
  subtitle,
  status,
  steps,
  activeStep = 0,
  progress,
  className,
  children,
}: AppLoaderProps) {
  const hasSteps = steps && steps.length > 1;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        className
      )}
    >
      <AppLoaderOrb />

      <h2 className="mt-8 max-w-full whitespace-nowrap text-4xl font-bold tracking-tight text-white sm:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-xl text-zinc-400">{subtitle}</p>
      )}

      {hasSteps && (
        <StepIndicators steps={steps} activeIndex={activeStep} />
      )}

      {typeof progress === "number" && !hasSteps && (
        <SimpleProgress progress={progress} />
      )}

      {status && !hasSteps && (
        <p className="mt-5 text-lg text-zinc-500">{status}</p>
      )}

      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fullscreen wrapper                                                */
/* ------------------------------------------------------------------ */

export function AppLoaderFullscreen(props: AppLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-40" />
      <div className="relative z-10 mx-4 w-full max-w-md">
        <AppLoader {...props} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overlay wrapper (for preview panels)                              */
/* ------------------------------------------------------------------ */

export function AppLoaderOverlay(props: AppLoaderProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/88 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-45" />
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950/85 p-8 shadow-[0_0_60px_rgba(124,58,237,0.2)]">
        <AppLoader {...props} className="py-2" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Auto-progress hook (ported from old loader)                       */
/* ------------------------------------------------------------------ */

export function useAutoProgress({
  enabled = false,
  intervalMs = 1000,
  step = 1,
}: {
  enabled?: boolean;
  intervalMs?: number;
  step?: number;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    setValue(0);
    const timer = window.setInterval(() => {
      setValue((prev) => Math.min(100, prev + Math.max(1, Math.round(step))));
    }, Math.max(150, Math.round(intervalMs)));
    return () => window.clearInterval(timer);
  }, [enabled, intervalMs, step]);

  return value;
}
