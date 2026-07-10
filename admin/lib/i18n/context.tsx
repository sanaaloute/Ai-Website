"use client";

import { createContext } from "react";
import { Locale } from "./config";
import { Dictionary } from "./dictionaries";

export interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
