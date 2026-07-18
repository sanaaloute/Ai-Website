"use client";

import { useTranslations } from "next-intl";

interface LegalPageProps {
  titleKey: "terms" | "privacy" | "refund";
  children: React.ReactNode;
}

export function LegalPage({ titleKey, children }: LegalPageProps) {
  const t = useTranslations("legal");
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:px-8 lg:px-10">
      <h1 className="text-2xl font-bold text-white md:text-3xl">
        {t(`${titleKey}.title`)}
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        {t(`${titleKey}.lastUpdated`, { date: today })}
      </p>

      <article className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-300">
        {children}
      </article>

      <p className="mt-12 text-xs text-zinc-600">
        {t("disclaimer")}
      </p>
    </main>
  );
}
