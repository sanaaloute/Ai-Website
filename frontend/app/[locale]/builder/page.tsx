import { use } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Builder",
  robots: { index: false, follow: false }
};

/** Canonical builder lives at `/generation`; keep `/builder` as a short URL. */
export default function BuilderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  redirect("/generation");
}
