"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const locales = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "ar", label: "العربية" }
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-background-soft/60 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-glow-cyan/50 hover:text-white"
        aria-expanded={open ? "true" : "false"}
        aria-controls="language-menu"
        aria-label="Select language"
      >
        <Globe size={13} />
        <span className="uppercase">{locale}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-40 overflow-hidden rounded-xl border border-white/10 bg-background/95 shadow-2xl backdrop-blur-2xl">
          <nav id="language-menu" aria-label="Languages">
            <ul className="py-1">
              {locales.map((l) => (
                <li key={l.code}>
                  <Link
                    href={pathname}
                    locale={l.code}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 text-sm transition ${
                      locale === l.code
                        ? "bg-white/5 font-medium text-white"
                        : "text-zinc-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{l.label}</span>
                    {locale === l.code && (
                      <span className="h-1.5 w-1.5 rounded-full bg-glow-cyan" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
