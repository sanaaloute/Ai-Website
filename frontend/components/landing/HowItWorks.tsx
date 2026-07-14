"use client";

import { PenLine, Rocket, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";

const stepIcons = [PenLine, Wand2, Rocket] as const;

export default function HowItWorks() {
  const t = useTranslations("howItWorks");
  const steps = [
    {
      icon: stepIcons[0],
      title: t("step1.title"),
      body: t("step1.body"),
      label: t("step1.label"),
    },
    {
      icon: stepIcons[1],
      title: t("step2.title"),
      body: t("step2.body"),
      label: t("step2.label"),
    },
    {
      icon: stepIcons[2],
      title: t("step3.title"),
      body: t("step3.body"),
      label: t("step3.label"),
    },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-24 space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
          {t("overline")}
        </p>
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {t("heading")}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
          {t("subheading")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.title}
            className="relative rounded-2xl border border-white/10 bg-background-soft/50 p-5 transition hover:border-white/15"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background text-primary ring-1 ring-white/10">
                <step.icon size={18} />
              </div>
              <span className="text-xs font-bold text-zinc-600">{step.label}</span>
            </div>

            <h3 className="mt-4 text-base font-semibold text-white">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
