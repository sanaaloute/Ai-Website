import type { Metadata } from "next";
import { use } from "react";
import { setRequestLocale } from "next-intl/server";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import HowItWorks from "@/components/landing/HowItWorks";
import TemplatesPageShell from "@/components/templates/TemplatesPageShell";

import { canonicalAlternates } from "@/lib/seo";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "How it works",
    description:
      "From prompt to production in three steps — describe your idea, let AI build it, and ship your website.",
    alternates: canonicalAlternates(locale, "/how-it-works")
  };
}

export default function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return (
    <TemplatesPageShell>
      <main className="relative flex min-h-screen flex-col overflow-x-hidden">
        <Navbar />
        <div aria-hidden className="h-16 sm:h-[4.2rem]" />

        <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col px-4 pb-20 pt-12 sm:px-6 sm:pt-16 md:px-8 lg:px-10">
          <HowItWorks />
        </div>

        <Footer />
      </main>
    </TemplatesPageShell>
  );
}
