import { Check } from "lucide-react";
import { content } from "@/lib/content";

export default function Pricing() {
  const { pricing } = content;

  return (
    <section
      id="pricing"
      className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {pricing.title}
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">{pricing.subtitle}</p>
      </div>
      <div className="mt-16 grid items-stretch gap-8 lg:grid-cols-3">
        {pricing.tiers.map((tier) => (
          <div
            key={tier.name}
            className={`relative flex flex-col rounded-2xl border bg-card p-8 ${
              tier.highlighted
                ? "border-primary shadow-xl ring-1 ring-primary"
                : "border-border"
            }`}
          >
            {tier.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-semibold">{tier.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {tier.description}
            </p>
            <p className="mt-6">
              <span className="text-4xl font-bold tracking-tight">
                {tier.price}
              </span>
              {tier.period && (
                <span className="ml-1 text-sm text-muted-foreground">
                  {tier.period}
                </span>
              )}
            </p>
            <a
              href="#"
              className={`mt-6 inline-flex h-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                tier.highlighted
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border hover:bg-muted"
              }`}
            >
              {tier.cta}
            </a>
            <ul className="mt-8 space-y-3">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
