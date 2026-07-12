"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCheckout } from "@/hooks/useCheckout";
import { getBillingPlans } from "@/lib/api/client";
import { useLandingAuthStore } from "@/stores/landingAuthStore";
import { useEntitlementsStore } from "@/stores/entitlementsStore";

type PaidPlanId = "basic" | "standard" | "pro";
type PlanId = "trial" | PaidPlanId;

const PLAN_ORDER: PlanId[] = ["trial", "basic", "standard", "pro"];

/** Fallback display prices when /billing/plans is unavailable. */
const FALLBACK_PRICES: Record<PlanId, { monthly: number; yearly: number }> = {
  trial: { monthly: 0, yearly: 0 },
  basic: { monthly: 9.9, yearly: 108.9 },
  standard: { monthly: 19.9, yearly: 218.9 },
  pro: { monthly: 39.9, yearly: 438.9 },
};

/** Format a USD price: integers stay plain ("$9"), decimals get 2 places ("$9.90"). */
const formatPrice = (amount: number) =>
  Number.isInteger(amount) ? String(amount) : amount.toFixed(2);

export default function PricingSection() {
  const t = useTranslations("pricing");
  const { checkout, loading: checkoutLoading, error: checkoutError } = useCheckout();
  const isAuthenticated = useLandingAuthStore((s) => s.isAuthenticated);
  const openLoginDialog = useLandingAuthStore((s) => s.openLoginDialog);
  const entitlements = useEntitlementsStore((s) => s.entitlements);
  const loadEntitlements = useEntitlementsStore((s) => s.loadEntitlements);

  const [yearly, setYearly] = useState(false);
  const [busyPlan, setBusyPlan] = useState<PaidPlanId | null>(null);
  const [priceIds, setPriceIds] = useState<
    Record<PaidPlanId, { monthly: string | null; yearly: string | null }>
  >({ basic: { monthly: null, yearly: null }, standard: { monthly: null, yearly: null }, pro: { monthly: null, yearly: null } });
  const [apiPrices, setApiPrices] = useState<Record<string, { monthly: number; yearly: number }>>({});

  useEffect(() => {
    let cancelled = false;
    void getBillingPlans().then((result) => {
      if (cancelled || !result.ok) return;
      const ids = { ...priceIds };
      const prices: Record<string, { monthly: number; yearly: number }> = {};
      for (const plan of result.data.plans) {
        ids[plan.id] = { monthly: plan.priceIdMonthly, yearly: plan.priceIdYearly };
        prices[plan.id] = { monthly: plan.priceMonthly, yearly: plan.priceYearly };
      }
      setPriceIds(ids);
      setApiPrices(prices);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated && !entitlements) void loadEntitlements();
  }, [isAuthenticated, entitlements, loadEntitlements]);

  const currentPlan = entitlements?.plan ?? null;

  const handleChoose = async (plan: PaidPlanId) => {
    if (!isAuthenticated) {
      openLoginDialog();
      return;
    }
    const priceId = yearly ? priceIds[plan].yearly : priceIds[plan].monthly;
    if (!priceId) return;
    setBusyPlan(plan);
    try {
      const url = await checkout({
        priceId,
        billingMode: "subscription",
        successUrl: `${window.location.origin}/profile?checkout=success`,
        cancelUrl: `${window.location.href.split("#")[0]}#pricing`,
      });
      if (url) window.location.href = url;
    } finally {
      setBusyPlan(null);
    }
  };

  const priceFor = useMemo(
    () => (plan: PlanId) => {
      const api = apiPrices[plan];
      const fallback = FALLBACK_PRICES[plan];
      const amount = yearly ? api?.monthly !== undefined ? api.yearly : fallback.yearly : api?.monthly ?? fallback.monthly;
      return amount;
    },
    [apiPrices, yearly]
  );

  return (
    <section id="pricing" className="scroll-mt-24 space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
          {t("overline")}
        </p>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          {t("subheading")}
        </p>
        <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-background-soft/60 p-1 text-xs">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={`rounded-full px-3 py-1.5 font-medium transition ${
              !yearly ? "bg-primary text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            {t("monthly")}
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${
              yearly ? "bg-primary text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            {t("yearly")}
            <span className="rounded-full bg-glow-cyan/15 px-1.5 py-0.5 text-[10px] font-semibold text-glow-cyan">
              {t("yearlyBadge")}
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((plan) => {
          const price = priceFor(plan);
          const isCurrent = currentPlan === plan;
          const isPopular = plan === "standard";
          const isPaid = plan !== "trial";
          const priceId = isPaid
            ? yearly
              ? priceIds[plan as PaidPlanId].yearly
              : priceIds[plan as PaidPlanId].monthly
            : null;
          const ctaDisabled = isCurrent || (isPaid && !priceId);
          const features = t.raw(`plans.${plan}.features`) as string[];

          return (
            <div
              key={plan}
              className={`relative flex flex-col rounded-2xl border p-5 transition ${
                isPopular
                  ? "border-primary/60 bg-background-soft/70 shadow-soft-glow"
                  : "border-white/10 bg-background-soft/50 hover:border-white/15"
              }`}
            >
              {isPopular && (
                <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  <Sparkles size={10} />
                  {t("mostPopular")}
                </span>
              )}

              <h3 className="text-base font-semibold text-white">
                {t(`plans.${plan}.name`)}
              </h3>
              <p className="mt-1 min-h-10 text-xs leading-relaxed text-zinc-400">
                {t(`plans.${plan}.description`)}
              </p>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">${formatPrice(price)}</span>
                {price > 0 && (
                  <span className="text-xs text-zinc-500">
                    {yearly ? t("perYear") : t("perMonth")}
                  </span>
                )}
              </div>

              <ul className="mt-4 flex-1 space-y-2">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-zinc-300">
                    <Check size={14} className="mt-0.5 shrink-0 text-glow-cyan" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="mt-5 inline-flex items-center justify-center rounded-xl border border-glow-cyan/40 bg-glow-cyan/10 px-4 py-2.5 text-xs font-semibold text-glow-cyan">
                  {t("currentPlan")}
                </div>
              ) : !isPaid ? (
                <a
                  href="#top"
                  className="mt-5 inline-flex items-center justify-center rounded-xl border border-white/15 bg-background/70 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-glow-cyan/60 hover:text-white"
                >
                  {t(`plans.${plan}.cta`)}
                </a>
              ) : (
                <button
                  type="button"
                  disabled={ctaDisabled || busyPlan === plan || checkoutLoading}
                  onClick={() => void handleChoose(plan as PaidPlanId)}
                  title={!priceId ? t("checkoutUnavailable") : undefined}
                  className={`mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isPopular
                      ? "bg-gradient-to-r from-primary via-primary-soft to-primary-accent text-white shadow-soft-glow hover:-translate-y-0.5"
                      : "border border-white/15 bg-background/70 text-zinc-200 hover:border-glow-cyan/60 hover:text-white"
                  }`}
                >
                  {busyPlan === plan && <Loader2 size={14} className="animate-spin" />}
                  {isAuthenticated
                    ? t("choosePlan", { plan: t(`plans.${plan}.name`) })
                    : t("signInToUpgrade")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-zinc-500">
        <span>{t("trustNoCard")}</span>
        <span>{t("trustCancel")}</span>
        <span>{t("trustRefund")}</span>
      </div>

      {checkoutError && (
        <p className="text-xs text-red-300">{checkoutError}</p>
      )}
    </section>
  );
}
