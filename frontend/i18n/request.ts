import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const resolvedLocale: string =
    locale && routing.locales.includes(locale as any)
      ? locale
      : (await requestLocale) || routing.defaultLocale;

  const messages = (await import(`../messages/${resolvedLocale}.json`)).default;

  return {
    locale: resolvedLocale,
    messages
  };
});
