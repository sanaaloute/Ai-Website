"use client";

import { useEffect } from "react";
import { Loader2, CreditCard, Gauge, ArrowUpCircle } from "lucide-react";
import type { ProfilePayload, SubscriptionPayload } from "./UserProfile.types";
import { Link } from "@/i18n/navigation";
import { useEntitlementsStore } from "@/stores/entitlementsStore";

interface SubscriptionSectionProps {
  subscription: SubscriptionPayload | null;
  profile: ProfilePayload;
  portalLoading: boolean;
  onOpenBillingPortal: () => void;
}

function UsageMeter({
  label,
  used,
  limit,
  format,
}: {
  label: string;
  used: number;
  limit: number | null;
  format: (value: number) => string;
}) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const nearLimit = limit !== null && used >= limit * 0.8;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">{label}</span>
        <span className={nearLimit ? "font-medium text-amber-200" : "text-zinc-300"}>
          {format(used)} / {limit === null ? "∞" : format(limit)}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${
            nearLimit ? "bg-amber-400" : "bg-glow-cyan"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function SubscriptionSection({
  subscription,
  profile,
  portalLoading,
  onOpenBillingPortal
}: SubscriptionSectionProps) {
  const entitlements = useEntitlementsStore((s) => s.entitlements);
  const loadEntitlements = useEntitlementsStore((s) => s.loadEntitlements);

  useEffect(() => {
    if (!entitlements) void loadEntitlements();
  }, [entitlements, loadEntitlements]);

  const formatHours = (seconds: number) => `${(seconds / 3600).toFixed(1)}h`;
  const showUpgrade = entitlements && entitlements.plan !== "pro";
  const hasLifetimeGenerations = entitlements?.limits.generationsLifetime != null;

  return (
    <section className="rounded-2xl border border-white/10 bg-background-soft/90 p-5 shadow-[0_0_40px_rgba(15,23,42,0.9)] backdrop-blur-xl">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <CreditCard size={18} className="text-glow-cyan" />
        Subscription
      </h2>

      {subscription ? (
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-3">
            <dt className="text-zinc-500">Plan</dt>
            <dd className="font-medium text-white">
              {subscription.plan_label}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-3">
            <dt className="text-zinc-500">Billing</dt>
            <dd className="text-zinc-200">{subscription.billing_label}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-3">
            <dt className="text-zinc-500">Price</dt>
            <dd className="text-zinc-200">{subscription.price_display}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-3">
            <dt className="text-zinc-500">Status</dt>
            <dd className="capitalize text-zinc-200">{subscription.status}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-3">
            <dt className="text-zinc-500">Subscribed</dt>
            <dd className="text-zinc-200">{subscription.subscribed_at_label}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-3">
            <dt className="text-zinc-500">Current period</dt>
            <dd className="text-right text-zinc-200">
              {subscription.period_start_label} → {subscription.period_end_label}
            </dd>
          </div>
          {subscription.cancel_at_period_end && (
            <p className="text-xs text-amber-200/90">
              Cancels at the end of the current period.
            </p>
          )}
        </dl>
      ) : (
        <div className="mt-4 rounded-xl border border-white/10 bg-background/50 px-3 py-4 text-sm text-zinc-400">
          <p className="font-medium text-zinc-300">No subscription on file</p>
          <p className="mt-1 text-xs">
            Account tier:{" "}
            <span className="capitalize text-white">
              {profile.subscription_type}
            </span>
            {profile.subscribed ? " (subscribed)" : ""}.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {entitlements && (
          <div className="rounded-xl border border-white/10 bg-background/50 p-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
              <Gauge size={14} className="text-glow-cyan" />
              {hasLifetimeGenerations ? "Lifetime usage" : "Usage this month"}
              <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium capitalize text-zinc-400">
                {entitlements.planLabel}
              </span>
            </h3>
            <div className="mt-3 space-y-2.5">
              <UsageMeter
                label="Generations"
                used={entitlements.usage.generations}
                limit={
                  entitlements.limits.generationsPerMonth ??
                  entitlements.limits.generationsLifetime
                }
                format={(v) => String(v)}
              />
              <UsageMeter
                label="Sandbox hours"
                used={entitlements.usage.sandboxSeconds}
                limit={entitlements.limits.sandboxSecondsPerMonth}
                format={formatHours}
              />
              <UsageMeter
                label="Saved projects"
                used={entitlements.usage.projects}
                limit={entitlements.limits.maxProjects}
                format={(v) => String(v)}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={portalLoading}
            onClick={() => void onOpenBillingPortal()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-background/70 px-4 py-2.5 text-xs font-medium text-zinc-200 transition hover:border-glow-cyan/50 hover:text-white disabled:opacity-50"
          >
            {portalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard size={16} />
            )}
            Manage billing
          </button>
          {showUpgrade && (
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary via-primary-soft to-primary-accent px-4 py-2.5 text-xs font-semibold text-white shadow-soft-glow transition hover:-translate-y-0.5"
            >
              <ArrowUpCircle size={16} />
              Upgrade plan
            </Link>
          )}
        </div>
        <p className="text-[10px] text-zinc-500">
          Opens the customer portal when you have an active subscription.
        </p>
      </div>
    </section>
  );
}
