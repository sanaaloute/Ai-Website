import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import TemplatePresetGrid from "@/components/templates/TemplatePresetGrid";
import TemplatesPageShell from "@/components/templates/TemplatesPageShell";
import {
  getTemplateSectorBySlug,
  listSectorSlugs,
  listTemplatePresetsBySectorId
} from "@/lib/templates/catalog";
import { canonicalAlternates } from "@/lib/seo";

type PageProps = {
  params: Promise<{ locale: string; sectorSlug: string }>;
};

export function generateStaticParams(): { sectorSlug: string }[] {
  return listSectorSlugs().map((sectorSlug) => ({ sectorSlug }));
}

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const { locale, sectorSlug } = await params;
  const sector = getTemplateSectorBySlug(sectorSlug);
  if (!sector) {
    return { title: "Templates" };
  }
  return {
    title: `${sector.name} templates`,
    description: sector.description,
    alternates: canonicalAlternates(locale, `/templates/${sectorSlug}`)
  };
}

import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function SectorTemplatesPage({ params }: PageProps) {
  const { locale, sectorSlug } = await params;
  setRequestLocale(locale);
  const sector = getTemplateSectorBySlug(sectorSlug);
  if (!sector) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "templates" });
  const tSectors = await getTranslations({ locale, namespace: "templateSectors" });
  const sectorName = tSectors.has(`${sector.slug}.name`)
    ? tSectors(`${sector.slug}.name`)
    : sector.name;
  const sectorDescription = tSectors.has(`${sector.slug}.description`)
    ? tSectors(`${sector.slug}.description`)
    : sector.description;

  const presets = listTemplatePresetsBySectorId(sector.id);

  return (
    <TemplatesPageShell>
      <main className="relative flex min-h-screen flex-col overflow-x-hidden">
        <Navbar />
        <div aria-hidden className="h-20 sm:h-[5.25rem]" />

        <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col px-3 pb-20 pt-6 sm:px-4 sm:pb-24 sm:pt-10 md:px-8 lg:px-10">
          {/* Back link */}
          <div className="mb-8 flex justify-center">
            <Link
              href="/templates"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-background-soft/60 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:border-glow-cyan/30 hover:text-white"
            >
              <ChevronLeft size={16} className="shrink-0" />
              {t("allSectors")}
            </Link>
          </div>

          {/* Header */}
          <header className="mb-12 max-w-2xl mx-auto text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-glow-cyan">
              {sectorName}
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {t("heading")}
            </h1>
            <p className="mt-4 text-pretty text-base text-zinc-400 sm:text-lg">
              {sectorDescription}
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-background-soft/60 px-4 py-1.5 text-xs text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t("inSectorBadge", { count: presets.length })}
            </div>
          </header>

          {presets.length === 0 ? (
            <p className="rounded-3xl border border-white/10 bg-background-soft/60 px-4 py-12 text-center text-sm text-zinc-400">
              {t("emptySector")}{" "}
              <Link href="/templates" className="text-glow-cyan hover:underline">
                {t("browseOtherSectors")}
              </Link>
              .
            </p>
          ) : (
            <TemplatePresetGrid presets={presets} />
          )}
        </div>

        <Footer />
      </main>
    </TemplatesPageShell>
  );
}
