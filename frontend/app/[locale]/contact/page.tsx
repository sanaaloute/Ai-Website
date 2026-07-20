import type { Metadata } from "next";
import { use } from "react";
import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Mail, Phone } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import TemplatesPageShell from "@/components/templates/TemplatesPageShell";

import { canonicalAlternates } from "@/lib/seo";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Contact",
    description:
      "Get in touch with the AI-Website team — questions, feedback, or partnership ideas are all welcome.",
    alternates: canonicalAlternates(locale, "/contact")
  };
}

export default function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("contact");
  const email = t("emailValue");
  const phone = t("phoneValue");
  const phoneHref = `tel:${phone.replace(/[^+\d]/g, "")}`;

  return (
    <TemplatesPageShell>
      <main className="relative flex min-h-screen flex-col overflow-x-hidden">
        <Navbar />
        <div aria-hidden className="h-16 sm:h-[4.2rem]" />

        <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-1 flex-col items-center justify-center px-4 pb-20 pt-12 text-center sm:px-6 sm:pt-16 md:px-8 lg:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-glow-cyan">
            {t("overline")}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {t("heading")}
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-base text-zinc-400 sm:text-lg">
            {t("subheading")}
          </p>

          <div className="mt-10 w-full max-w-md rounded-2xl border border-white/10 bg-background-soft/50 p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-background text-primary ring-1 ring-white/10">
              <Mail size={20} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-soft-glow transition hover:bg-primary/90"
              >
                <Mail size={16} aria-hidden />
                {t("emailLabel")}
              </a>
              <a
                href={phoneHref}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-glow-cyan/45 hover:bg-white/10"
              >
                <Phone size={16} aria-hidden />
                {t("phoneLabel")}
              </a>
            </div>
            <p className="mt-3 text-sm text-zinc-400">{email}</p>
            <p dir="ltr" className="mt-1 text-sm text-zinc-400">
              {phone}
            </p>
            <p className="mt-2 text-xs text-zinc-500">{t("responseTime")}</p>
          </div>
        </div>

        <Footer />
      </main>
    </TemplatesPageShell>
  );
}
