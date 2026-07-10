"use client";

import { cn } from "@/utils/cn";

export const panelClass = cn(
  "relative overflow-hidden border border-white/12",
  "bg-gradient-to-b from-[#12121a] via-[#0c0c14] to-[#08080e]",
  "text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_28px_64px_-12px_rgba(0,0,0,0.65)]",
  "backdrop-blur-xl sm:rounded-2xl",
);

export function DialogSurfaceDecor({ variant }: { variant: "gitcc" | "database" }) {
  const topBar =
    variant === "gitcc"
      ? "from-violet-500 via-fuchsia-400 to-cyan-300/70"
      : "from-emerald-400 via-teal-500/60 to-cyan-400/50";
  const orbA =
    variant === "gitcc"
      ? "from-violet-500/35 to-transparent"
      : "from-emerald-500/25 to-transparent";
  const orbB =
    variant === "gitcc"
      ? "from-fuchsia-500/20 to-transparent"
      : "from-cyan-500/15 to-transparent";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-[0.95]",
          topBar,
        )}
      />
      <div
        className={cn(
          "absolute -right-10 -top-8 h-40 w-40 rounded-full bg-gradient-to-br blur-2xl",
          orbA,
        )}
      />
      <div
        className={cn(
          "absolute -bottom-12 -left-8 h-36 w-48 rounded-full bg-gradient-to-tr blur-3xl",
          orbB,
        )}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.06),transparent_55%)]" />
    </div>
  );
}
