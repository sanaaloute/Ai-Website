"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  Locale,
  defaultLocale,
  detectLocale,
  getTranslations,
  Translations,
  rtlLocales,
} from "./translations";

type LanguageScope = "store" | "admin";

interface LanguageContextValue {
  locale: Locale;
  translations: Translations;
  setLocale: (locale: Locale) => void;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getStorageKey(scope: LanguageScope): string {
  return `daacoo-language-${scope}`;
}

function getSavedLocale(scope: LanguageScope): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(getStorageKey(scope));
    if (stored) return stored as Locale;
  } catch {
    // ignore
  }
  return null;
}

function saveLocale(scope: LanguageScope, locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(scope), locale);
  } catch {
    // ignore
  }
}

interface LanguageProviderProps {
  children: ReactNode;
  scope: LanguageScope;
}

export function LanguageProvider({ children, scope }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = getSavedLocale(scope);
    if (saved) {
      setLocaleState(saved);
    } else {
      const detected = detectLocale();
      setLocaleState(detected);
      saveLocale(scope, detected);
    }
    setMounted(true);
  }, [scope]);

  useEffect(() => {
    if (!mounted) return;
    const isRTL = rtlLocales.includes(locale);
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale, mounted]);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      saveLocale(scope, newLocale);
    },
    [scope]
  );

  const translations = getTranslations(locale);
  const isRTL = rtlLocales.includes(locale);

  return (
    <LanguageContext.Provider
      value={{ locale, translations, setLocale, isRTL }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
