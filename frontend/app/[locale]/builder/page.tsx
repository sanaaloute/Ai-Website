import { use } from "react";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

/** Canonical builder lives at `/generation`; keep `/builder` as a short URL. */
export default function BuilderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  redirect("/generation");
}
