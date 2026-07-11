"use client";

import {
  formatCurrency as baseFormatCurrency,
  formatNumber as baseFormatNumber,
  formatPercent as baseFormatPercent,
  formatDate as baseFormatDate,
  formatDateTime as baseFormatDateTime,
  formatRelativeTime as baseFormatRelativeTime,
} from "@/lib/utils";
import { useTranslation } from "./use-translation";
import { isRTL } from "./config";

export function useFormatters() {
  const { locale, t } = useTranslation();

  const localeForIntl = locale === "ar" ? "ar-SA" : locale === "zh" ? "zh-CN" : locale;

  return {
    locale,
    isRTL: isRTL(locale),
    formatCurrency: (value: number) => baseFormatCurrency(value, localeForIntl),
    formatNumber: (value: number) => baseFormatNumber(value, localeForIntl),
    formatPercent: baseFormatPercent,
    formatDate: (dateString: string) => baseFormatDate(dateString, localeForIntl),
    formatDateTime: (dateString: string) => baseFormatDateTime(dateString, localeForIntl),
    formatRelativeTime: (dateString: string) =>
      baseFormatRelativeTime(dateString, localeForIntl, {
        justNow: t("activityFeed.relativeTime.justNow"),
        minutesAgo: t("activityFeed.relativeTime.minutesAgo"),
        hoursAgo: t("activityFeed.relativeTime.hoursAgo"),
        daysAgo: t("activityFeed.relativeTime.daysAgo"),
      }),
  };
}
