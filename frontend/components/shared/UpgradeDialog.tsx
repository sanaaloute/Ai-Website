"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useEntitlementsStore } from "@/stores/entitlementsStore";

const FEATURE_LABELS: Record<string, string> = {
  github_push: "Push to GitHub",
  db_integration: "Database integration",
  deploy: "One-click deploy",
  custom_domain: "Custom domain",
  templates: "Pre-built templates",
};

const PLAN_LABELS: Record<string, string> = {
  basic: "Basic",
  standard: "Standard",
  pro: "Pro",
};

/**
 * Paywall dialog shown when a plan-gated action fails with PLAN_LIMIT
 * (or when a locked feature button is clicked). Mounted once in the Navbar.
 */
export function UpgradeDialog() {
  const upgradePrompt = useEntitlementsStore((s) => s.upgradePrompt);
  const closeUpgradeDialog = useEntitlementsStore((s) => s.closeUpgradeDialog);

  const title = upgradePrompt?.feature
    ? FEATURE_LABELS[upgradePrompt.feature] ?? "This feature"
    : "Plan limit reached";
  const planLabel = upgradePrompt ? PLAN_LABELS[upgradePrompt.requiredPlan] : "";

  return (
    <AnimatePresence>
      {upgradePrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-2xl sm:px-6"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-background/95 p-5 shadow-2xl">
            <button
              type="button"
              onClick={closeUpgradeDialog}
              className="absolute right-2 top-2 rounded-full bg-background-soft/90 p-2 text-zinc-400 hover:text-white sm:right-4 sm:top-4"
              aria-label="Close upgrade dialog"
            >
              <X size={16} />
            </button>

            <div className="pr-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-background-soft/70 px-3 py-1 text-xs text-zinc-300">
                <Sparkles size={14} className="text-glow-cyan" />
                Upgrade required
              </div>
              <h3 className="mt-3 text-lg font-semibold text-white">
                {title} requires the {planLabel} plan
              </h3>
              <p className="mt-1 text-sm text-zinc-400">{upgradePrompt.message}</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href="/pricing"
                onClick={closeUpgradeDialog}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary via-primary-soft to-primary-accent px-4 py-2.5 text-sm font-semibold text-white shadow-soft-glow transition hover:-translate-y-0.5"
              >
                View pricing
              </Link>
              <button
                type="button"
                onClick={closeUpgradeDialog}
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-background-soft/70 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-glow-cyan/60 hover:text-white"
              >
                Not now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
