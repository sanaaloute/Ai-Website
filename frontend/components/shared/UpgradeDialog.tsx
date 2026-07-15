"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Sparkles, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useEntitlementsStore } from "@/stores/entitlementsStore";

const FEATURE_KEYS: Record<string, string> = {
  github_push: "features.github_push",
  db_integration: "features.db_integration",
  deploy: "features.deploy",
  custom_domain: "features.custom_domain",
  templates: "features.templates",
};

const PLAN_KEYS: Record<string, string> = {
  basic: "plans.basic",
  standard: "plans.standard",
  pro: "plans.pro",
};

/**
 * Paywall dialog shown when a plan-gated action fails with PLAN_LIMIT
 * (or when a locked feature button is clicked). Mounted once in the Navbar.
 */
export function UpgradeDialog() {
  const upgradePrompt = useEntitlementsStore((s) => s.upgradePrompt);
  const closeUpgradeDialog = useEntitlementsStore((s) => s.closeUpgradeDialog);
  const t = useTranslations("generation");

  const featureKey = upgradePrompt?.feature
    ? FEATURE_KEYS[upgradePrompt.feature]
    : undefined;
  const title = upgradePrompt?.feature
    ? featureKey
      ? t(`upgrade.${featureKey}`)
      : t("upgrade.thisFeature")
    : t("upgrade.planLimitReached");
  const planKey = upgradePrompt
    ? PLAN_KEYS[upgradePrompt.requiredPlan]
    : undefined;
  const planLabel = upgradePrompt
    ? planKey
      ? t(`upgrade.${planKey}`)
      : upgradePrompt.requiredPlan
    : "";

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
              aria-label={t("upgrade.closeAria")}
            >
              <X size={16} />
            </button>

            <div className="pr-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-background-soft/70 px-3 py-1 text-xs text-zinc-300">
                <Sparkles size={14} className="text-glow-cyan" />
                {t("upgrade.badge")}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-white">
                {t("upgrade.requiresPlan", { feature: title, plan: planLabel })}
              </h3>
              <p className="mt-1 text-sm text-zinc-400">{upgradePrompt.message}</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href="/pricing"
                onClick={closeUpgradeDialog}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary via-primary-soft to-primary-accent px-4 py-2.5 text-sm font-semibold text-white shadow-soft-glow transition hover:-translate-y-0.5"
              >
                {t("upgrade.viewPricing")}
              </Link>
              <button
                type="button"
                onClick={closeUpgradeDialog}
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-background-soft/70 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-glow-cyan/60 hover:text-white"
              >
                {t("upgrade.notNow")}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
