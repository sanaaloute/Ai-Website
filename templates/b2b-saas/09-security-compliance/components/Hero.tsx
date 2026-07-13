import { Check } from "lucide-react";
import { content } from "@/lib/content";

const chartBars = [40, 65, 50, 80, 60, 90, 70, 95, 75, 88, 100, 82];
const sidebarItems = ["Overview", "Reports", "Audience", "Settings"];

export default function Hero() {
  const { hero } = content;

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-primary/5" />
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {hero.badge}
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
            {hero.title} <span className="text-primary">{hero.highlight}</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">{hero.subtitle}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#pricing"
              className="inline-flex h-12 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              {hero.primaryCta}
            </a>
            <a
              href="#features"
              className="inline-flex h-12 items-center rounded-lg border border-border bg-background px-6 text-sm font-semibold transition-colors hover:bg-muted"
            >
              {hero.secondaryCta}
            </a>
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Check className="h-4 w-4 text-primary" />
            {hero.note}
          </p>
        </div>

        {/* Product preview mockup */}
        <div className="mt-16 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-4 hidden flex-1 sm:block">
              <span className="mx-auto block h-6 w-72 rounded-md bg-muted" />
            </span>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-[180px_1fr]">
            <div className="hidden flex-col gap-3 sm:flex">
              {sidebarItems.map((item, i) => (
                <div
                  key={item}
                  className={`flex h-9 items-center px-3 text-xs font-medium ${
                    i === 0
                      ? "rounded-lg bg-primary/15 text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {item}
                </div>
              ))}
              <div className="mt-auto h-24 rounded-lg bg-primary/10" />
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {hero.metrics.map((m) => (
                  <div
                    key={m.label}
                    className="rounded-xl border border-border p-4"
                  >
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="mt-1 text-2xl font-bold">{m.value}</p>
                    <p className="mt-1 text-xs font-medium text-primary">
                      {m.change}
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="flex h-36 items-end gap-2">
                  {chartBars.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-primary/80"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
