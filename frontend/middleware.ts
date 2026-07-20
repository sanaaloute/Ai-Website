import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip the locale redirect for SEO/metadata routes (robots.txt, sitemap.xml,
  // dynamically generated icons and OG images) alongside the existing skips.
  matcher: [
    "/((?!api|_next/static|_next/image|robots.txt|sitemap.xml|icon|apple-icon|opengraph-image|twitter-image|manifest.webmanifest|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
