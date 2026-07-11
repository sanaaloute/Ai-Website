"use client";

import { Monitor, Terminal, TrelloIcon } from "lucide-react";
import { useTranslations } from "next-intl";

const SOFTCHAT_WINDOWS_INSTALLER_URL = "https://github.com";

const platformIcons = [Monitor, Terminal, TrelloIcon] as const;

export default function Download() {
  const t = useTranslations("download");
  const buttons = [
    {
      id: "windows",
      label: t("windows"),
      description: t("windowsDesc"),
      icon: platformIcons[0]
    },
    {
      id: "linux",
      label: t("linux"),
      description: t("linuxDesc"),
      icon: platformIcons[1]
    },
    {
      id: "mac",
      label: t("mac"),
      description: t("macDesc"),
      icon: platformIcons[2]
    }
  ];

  return (
    <section id="download" className="scroll-mt-24">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
              {t("overline")}
            </p>
            <p className="mt-2 max-w-xl text-sm text-zinc-400 md:text-base">
              {t("description")}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {buttons.map((button) => {
              const href =
                button.id === "windows" ? SOFTCHAT_WINDOWS_INSTALLER_URL : undefined;
              const isExternal = Boolean(href?.startsWith("http"));
              const Tag = href ? "a" : "div";

              return (
                <Tag
                  key={button.label}
                  href={href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer" : undefined}
                  className="group relative inline-flex items-center justify-between overflow-hidden rounded-xl border border-white/10 bg-background/60 px-4 py-3 text-left text-sm text-white transition hover:border-white/15"
                >
                  <div className="relative flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-primary ring-1 ring-white/10">
                      <button.icon size={16} />
                    </div>
                    <div>
                      <p className="text-base font-semibold">{button.label}</p>
                      <p className="text-sm text-zinc-400">{button.description}</p>
                      {button.id !== "windows" && (
                        <p className="mt-0.5 text-xs text-zinc-600">{t("comingSoon")}</p>
                      )}
                    </div>
                  </div>
                  <span className="relative text-xs font-medium text-zinc-500 transition group-hover:text-primary">
                    {href ? t("download") : t("notifyMe")}
                  </span>
                </Tag>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
