import { use } from "react";
import { setRequestLocale } from "next-intl/server";
import HomePageContent from "@/components/landing/HomePageContent";
import TemplatesPageShell from "@/components/templates/TemplatesPageShell";

export const revalidate = 300;

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <TemplatesPageShell>
      <HomePageContent />
    </TemplatesPageShell>
  );
}
