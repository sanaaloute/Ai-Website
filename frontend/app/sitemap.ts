import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { canonicalAlternates, localeUrl } from "@/lib/seo";
import { listSectorSlugs } from "@/lib/templates/catalog";

/** Public, indexable routes. Private/tool pages (generation, builder, profile,
 * projects, login) are intentionally excluded — they are noindex. */
const PUBLIC_ROUTES: {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.8 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.8 },
  { path: "/templates", changeFrequency: "weekly", priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/refund-policy", changeFrequency: "yearly", priority: 0.3 }
];

/** Public template showcase pages. Guarded: if the catalog can't be read or is
 * empty, the sitemap just falls back to the static routes above. */
function sectorRoutes(): { path: string; changeFrequency: "monthly"; priority: number }[] {
  try {
    return listSectorSlugs()
      .filter(Boolean)
      .map((slug) => ({
        path: `/templates/${slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.6
      }));
  } catch {
    return [];
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [...PUBLIC_ROUTES, ...sectorRoutes()].flatMap(
    ({ path, changeFrequency, priority }) =>
      routing.locales.map((locale) => ({
        url: localeUrl(locale, path),
        lastModified,
        changeFrequency,
        priority,
        alternates: {
          languages: canonicalAlternates(locale, path).languages
        }
      }))
  );
}
