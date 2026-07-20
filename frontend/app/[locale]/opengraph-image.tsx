import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";

// Per-locale social card — same design as the root `app/opengraph-image.tsx`,
// with the product name and tagline (metadata.title / metadata.description)
// localized from messages/<locale>.json. Unknown locales fall back to English.
export const alt = "AI-Website — AI app builder";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// next/og's bundled font (Geist) only covers Latin. zh/ar cards load small
// self-hosted subset fonts from app/fonts/ (subset to exactly the OG strings).
const LOCALE_FONT_FILES: Partial<
  Record<Locale, { file: string; weight: 400 | 700 }[]>
> = {
  zh: [
    { file: "NotoSansSC-og-regular.otf", weight: 400 },
    { file: "NotoSansSC-og-bold.otf", weight: 700 }
  ],
  ar: [
    { file: "NotoSansArabic-og-regular.ttf", weight: 400 },
    { file: "NotoSansArabic-og-bold.ttf", weight: 700 }
  ]
};

const fontCache = new Map<string, Promise<Buffer>>();
function readFont(file: string): Promise<Buffer> {
  let cached = fontCache.get(file);
  if (!cached) {
    cached = readFile(path.join(process.cwd(), "app", "fonts", file));
    fontCache.set(file, cached);
  }
  return cached;
}

type OgFont = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
};

async function loadLocaleFonts(locale: Locale): Promise<OgFont[]> {
  const entries = LOCALE_FONT_FILES[locale];
  if (!entries) return [];
  try {
    return await Promise.all(
      entries.map(async ({ file, weight }) => ({
        name: "OGSans",
        data: await readFont(file),
        weight,
        style: "normal" as const
      }))
    );
  } catch {
    // Missing/corrupt subset font — fall back to the default Latin font rather
    // than failing the whole card.
    return [];
  }
}

// satori (next/og) crashes measuring a single text node that mixes Latin and
// Arabic, and its bidi handling of hand-split direction spans is unreliable —
// while PURE RTL text renders correctly. So if the tagline contains Arabic,
// drop the leading Latin brand prefix (the brand already sits on the title
// line); if any Latin letters remain after that, fall back to English.
const ARABIC_CHAR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_LETTER = /[A-Za-z]/;

export default async function LocaleOpenGraphImage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = routing.locales.includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const fonts = await loadLocaleFonts(locale);

  let tagline = t("description");
  if (ARABIC_CHAR.test(tagline)) {
    const stripped = tagline.replace(/^[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/, "");
    if (LATIN_LETTER.test(stripped)) {
      const en = await getTranslations({
        locale: routing.defaultLocale,
        namespace: "metadata"
      });
      tagline = en("description");
    } else {
      tagline = stripped;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 20% 20%, rgba(245, 158, 11, 0.25), transparent 55%), radial-gradient(circle at 80% 80%, rgba(251, 146, 60, 0.18), transparent 50%), #0A0A0F",
          color: "white",
          padding: 80,
          textAlign: "center",
          ...(fonts.length > 0 ? { fontFamily: "OGSans" } : {})
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "linear-gradient(135deg, #F59E0B 0%, #FB923C 100%)",
            color: "#0A0A0F",
            fontSize: 52,
            fontWeight: 700,
            marginBottom: 40
          }}
        >
          AI
        </div>
        <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: "-2px", maxWidth: 900, lineHeight: 1.1 }}>
          {t("title")}
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#D4D4D8",
            marginTop: 24,
            maxWidth: 980
          }}
        >
          {tagline}
        </div>
      </div>
    ),
    { ...size, ...(fonts.length > 0 ? { fonts } : {}) }
  );
}
