import { routing, type Locale } from "@/i18n/routing";

/** Absolute origin used for canonical URLs, OG tags, robots and sitemap. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-web-builder.com"
).replace(/\/+$/, "");

export const SITE_NAME = "AI-Website";

const OG_LOCALES: Record<Locale, string> = {
  en: "en_US",
  zh: "zh_CN",
  fr: "fr_FR",
  es: "es_ES",
  ar: "ar_SA"
};

export function ogLocaleFor(locale: string): string {
  return OG_LOCALES[locale as Locale] ?? OG_LOCALES[routing.defaultLocale];
}

/** Absolute, locale-prefixed URL (localePrefix is "always"). `path` starts with `/`. */
export function localeUrl(locale: string, path: string): string {
  const normalized = path === "/" ? "" : path;
  return `${SITE_URL}/${locale}${normalized}`;
}

/**
 * Canonical + hreflang alternates for one page: every locale variant plus an
 * `x-default` entry pointing at the default-locale URL. The concrete string
 * types satisfy both page metadata and sitemap alternates.
 */
export function canonicalAlternates(
  locale: string,
  path: string
): { canonical: string; languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = localeUrl(l, path);
  }
  languages["x-default"] = localeUrl(routing.defaultLocale, path);
  return {
    canonical: localeUrl(locale, path),
    languages
  };
}
