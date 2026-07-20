import { use } from "react";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import HomePageContent from "@/components/landing/HomePageContent";
import TemplatesPageShell from "@/components/templates/TemplatesPageShell";
import { canonicalAlternates, SITE_NAME, SITE_URL } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // Title, description and OG/Twitter tags come from the layout metadata;
  // this only adds the home-page canonical + hreflang links.
  return {
    alternates: canonicalAlternates(locale, "/")
  };
}

// Structured data for the platform itself. No SearchAction (the site has no
// search) and no ratings — only facts we can stand behind.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL
    },
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon`
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      description:
        "AI-Website is an AI app builder that turns ideas into full-stack web applications in seconds.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free tier — start building for free, upgrade when you are ready to ship."
      }
    }
  ]
};

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <TemplatesPageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePageContent />
    </TemplatesPageShell>
  );
}
