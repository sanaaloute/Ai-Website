"use client";

import { Github } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="mt-16 border-t border-white/5 bg-background-soft/30">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 py-4 text-sm text-zinc-500 md:flex-row md:justify-between md:px-8 lg:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-white">
            AW
          </div>
          <span className="font-semibold text-white">{t("brandName")}</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 text-sm">
          <a href="/templates" className="transition hover:text-white">
            {t("templates")}
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition hover:text-white"
          >
            <Github size={14} />
            <span>{t("github")}</span>
          </a>
          <a href="/" className="transition hover:text-white">
            {t("home")}
          </a>
          <a href="/projects" className="transition hover:text-white">
            {t("projects")}
          </a>
        </div>

        <div className="text-sm text-zinc-600">
          {t("copyright", { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
}
