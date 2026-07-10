export const DEFAULT_LOCALE = "en";

export const LOCALES = ["en", "es", "zh", "hi", "fr", "ar", "pt"] as const;

export type Locale = (typeof LOCALES)[number];

export const RTL_LOCALES: Locale[] = ["ar"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  zh: "中文",
  hi: "हिन्दी",
  fr: "Français",
  ar: "العربية",
  pt: "Português",
};

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Spanish",
  zh: "Chinese",
  hi: "Hindi",
  fr: "French",
  ar: "Arabic",
  pt: "Portuguese",
};

export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function isValidLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}
