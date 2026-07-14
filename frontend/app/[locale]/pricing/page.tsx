import type { Metadata } from "next";
import { use } from "react";
import { setRequestLocale } from "next-intl/server";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PricingSection from "@/components/landing/PricingSection";
import TemplatesPageShell from "@/components/templates/TemplatesPageShell";

export const metadata: Metadata = {
  title: "Pricing · AI-Website",
  description:
    "Start free, upgrade when you are ready to ship. No hidden fees, cancel anytime.",
};

export default function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return (
    <TemplatesPageShell>
      <main className="relative flex min-h-screen flex-col overflow-x-hidden">
        <Navbar />
        <div aria-hidden className="h-16 sm:h-[4.2rem]" />

        <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col px-4 pb-20 pt-12 sm:px-6 sm:pt-16 md:px-8 lg:px-10">
          <PricingSection />
        </div>

        <Footer />
      </main>
    </TemplatesPageShell>
  );
}
