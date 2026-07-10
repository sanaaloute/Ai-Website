"use client";

import { Loader2, CreditCard } from "lucide-react";
import type { ProfilePayload, SubscriptionPayload } from "./UserProfile.types";

interface SubscriptionSectionProps {
  subscription: SubscriptionPayload | null;
  profile: ProfilePayload;
  portalLoading: boolean;
  onOpenBillingPortal: () => void;
}

export default function SubscriptionSection({
  subscription,
  profile,
  portalLoading,
  onOpenBillingPortal
}: SubscriptionSectionProps) {
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
          <p className="font-medium text-zinc-300">No Stripe subscription on file</p>
          <p className="mt-1 text-xs">
            Account tier:{" "}
            <span className="capitalize text-white">
              {profile.subscription_type}
            </span>
            {profile.subscribed ? " (subscribed)" : ""}.
          </p>
        </div>
      )}

      <div className="mt-6">
        <button
          type="button"
          disabled={portalLoading}
          onClick={() => void onOpenBillingPortal()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-background/70 px-4 py-2.5 text-xs font-medium text-zinc-200 transition hover:border-glow-cyan/50 hover:text-white disabled:opacity-50 sm:w-auto"
        >
          {portalLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard size={16} />
          )}
          Manage billing in Stripe
        </button>
        <p className="mt-2 text-[10px] text-zinc-500">
          Opens the customer portal when you have an active Stripe customer.
        </p>
      </div>
    </section>
  );
}
