import type { Metadata } from "next";
import dynamic from "next/dynamic";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { canonicalAlternates, localeUrl, ogLocaleFor, SITE_NAME, SITE_URL } from "@/lib/seo";
import "../globals.css";

const BackgroundEffects = dynamic(
  () => import("@/components/landing/BackgroundEffects"),
  { loading: () => null }
);


const inter = localFont({
  // Self-hosted (latin, variable weights 100–900) so builds don't depend on
  // fetching Google Fonts at build time.
  src: "../fonts/InterVariable.woff2",
  display: "swap"
});



export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "metadata" });
  const title = t("title");
  const description = t("description");
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s · ${SITE_NAME}`
    },
    description,
    keywords: [
      "AI website builder",
      "AI app builder",
      "build a website with AI",
      "full-stack app generator",
      "AI code generator"
    ],
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: ogLocaleFor(locale),
      alternateLocale: routing.locales.filter((l) => l !== locale).map(ogLocaleFor),
      url: localeUrl(locale, "/"),
      title,
      description,
      images: [
        { url: `/${locale}/opengraph-image`, width: 1200, height: 630, alt: SITE_NAME }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/${locale}/opengraph-image`]
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large"
    },
    alternates: canonicalAlternates(locale, "/")
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className="scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className={`${inter.className} bg-background text-white antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <BackgroundEffects />
          <div className="relative z-10 min-h-screen">{children}</div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
