import type { Metadata } from "next";
import { use } from "react";
import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import TemplatesSectorGrid from "@/components/templates/TemplatesSectorGrid";
import TemplatesPageShell from "@/components/templates/TemplatesPageShell";
import { listTemplateSectors } from "@/lib/templates/catalog";
import { PRESET_ROWS } from "@/lib/templates/presets";

export const metadata: Metadata = {
  title: "Templates · AI-Website",
  description:
    "Browse AI-Website templates by industry — SaaS, e-commerce, fintech, and more. Clone or edit with AI in one click.",
};

export default function TemplatesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("templates");
  const sectors = listTemplateSectors();

  return (
    <TemplatesPageShell>
      <main className="relative flex min-h-screen flex-col overflow-x-hidden">
        <Navbar />
        <div aria-hidden className="h-20 sm:h-[5.25rem]" />

        <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col px-3 pb-20 pt-6 sm:px-4 sm:pb-24 sm:pt-10 md:px-8 lg:px-10">
          {/* Header */}
          <header className="mb-14 max-w-2xl mx-auto text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-glow-cyan">
              {t("overline")}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {t("heading")}
            </h1>
            <p className="mt-4 text-pretty text-base text-zinc-400 sm:text-lg">
              {t("subheading")}
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-background-soft/60 px-4 py-1.5 text-xs text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t("availableBadge", { count: PRESET_ROWS.length })}
            </div>
          </header>

          <TemplatesSectorGrid sectors={sectors} />
        </div>

        <Footer />
      </main>
    </TemplatesPageShell>
  );
}
