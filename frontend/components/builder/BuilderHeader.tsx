"use client";

import { Link } from "@/i18n/navigation";

export default function BuilderHeader() {
  return (
    <div className="flex items-center gap-3 px-1">
      <Link
        href="/"
        className="text-lg font-semibold tracking-tight text-white transition-colors hover:text-glow-cyan"
      >
        AI-Website
      </Link>
      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-glow-cyan/90">
        Builder
      </span>
    </div>
  );
}
