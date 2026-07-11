"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { I18nContext } from "./context";
import { Locale, DEFAULT_LOCALE, isValidLocale, isRTL } from "./config";
import { dictionaries, Dictionary } from "./dictionaries";

const STORAGE_KEY = "ai-website-locale";

function getInitialLocale(): Locale {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isValidLocale(stored)) return stored;
    const browserLang = navigator.language.split("-")[0];
    if (isValidLocale(browserLang)) return browserLang;
  }
  return DEFAULT_LOCALE;
}

function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(getInitialLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
      document.documentElement.dir = isRTL(next) ? "rtl" : "ltr";
    }
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = isRTL(locale) ? "rtl" : "ltr";
  }, [locale, mounted]);

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const value = useMemo(
    () => ({ locale, dict, setLocale }),
    [locale, dict, setLocale]
  );

  // Prevent hydration mismatch by rendering default locale until mounted
  if (!mounted) {
    return (
      <I18nContext.Provider
        value={{
          locale: DEFAULT_LOCALE,
          dict: getDictionary(DEFAULT_LOCALE),
          setLocale,
        }}
      >
        {children}
      </I18nContext.Provider>
    );
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
