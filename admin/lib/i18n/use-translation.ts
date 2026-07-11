"use client";

import { useContext, useCallback } from "react";
import { I18nContext } from "./context";

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  const { locale, dict, setLocale } = ctx;

  const t = useCallback(
    (key: string, replacements?: Record<string, string | number>): string => {
      const value = getNestedValue(dict, key);
      if (typeof value !== "string") {
        // Fallback: return the key if translation not found
        return key;
      }
      if (!replacements) return value;
      return Object.entries(replacements).reduce(
        (acc, [k, v]) => acc.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
        value
      );
    },
    [dict]
  );

  return { t, locale, setLocale, dict };
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && !Array.isArray(acc)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}
