import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GenerationOrb } from "@/components/builder/GenerationCognitionLoader";

export interface CodeApplicationState {
  stage: "analyzing" | "installing" | "applying" | "complete" | null;
  packages?: string[];
  installedPackages?: string[];
  filesGenerated?: string[];
  message?: string;
  currentFile?: string;
  deadlineAt?: number;
}

interface CodeApplicationProgressProps {
  state: CodeApplicationState;
}

export default function CodeApplicationProgress({ state }: CodeApplicationProgressProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!state.deadlineAt || state.stage === "complete") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state.deadlineAt, state.stage]);

  const countdownText = useMemo(() => {
    if (!state.deadlineAt) return null;
    const remainingMs = Math.max(0, state.deadlineAt - now);
    const totalSec = Math.ceil(remainingMs / 1000);
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    return `Auto-timeout in ${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }, [state.deadlineAt, now]);

  if (!state.stage || state.stage === "complete") return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="loading"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="mt-2 inline-block w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-background-soft/95 via-zinc-950/90 to-background-soft/95 p-4 shadow-[0_0_40px_rgba(124,58,237,0.15)] backdrop-blur-md"
      >
        <div className="flex items-start gap-4">
          <GenerationOrb size="xs" className="shrink-0 scale-90" />
          <div className="min-w-0 flex-1">
            <p className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-sm font-semibold text-transparent">
              {state.stage === "analyzing" && "Analyzing generated code"}
              {state.stage === "installing" && "Installing packages"}
              {state.stage === "applying" && "Applying to sandbox"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {state.message ||
                (state.stage === "analyzing" && "Parsing output and resolving dependencies…") ||
                (state.stage === "installing" && "npm is adding modules — this can take a moment…") ||
                (state.stage === "applying" && "Writing files into your live environment…")}
            </p>
            {countdownText ? (
              <p className="mt-1 text-[11px] text-zinc-500">{countdownText}</p>
            ) : null}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
