"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Footer() {
  const t = useTranslations("footer");
  const phone = t("phoneValue").replace(/[^+\d]/g, "");

  return (
    <footer className="border-t border-white/5 bg-background-soft/30">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 lg:px-10">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-white">
                AW
              </div>
              <span className="font-semibold text-white">{t("brandName")}</span>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">{t("legal")}</h3>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li>
                <Link href="/terms" className="transition hover:text-white">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition hover:text-white">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="transition hover:text-white">
                  {t("refundPolicy")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">{t("contact")}</h3>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li>
                <a href={`mailto:${t("emailValue")}`} className="transition hover:text-white">
                  {t("emailLabel")}: {t("emailValue")}
                </a>
              </li>
              <li>
                <a href={`tel:${phone}`} className="transition hover:text-white">
                  {t("phoneLabel")}: {t("phoneValue")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/5 pt-4 text-center text-sm text-zinc-600">
          {t("copyright", { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
}
