const LOCALES = ['en', 'zh', 'fr', 'es', 'ar'];

/**
 * Normalize the current pathname for the generation page.
 * Handles the case where a locale prefix was accidentally duplicated
 * (e.g. `/en/en/generation` -> `/en/generation`).
 */
export function getGenerationPathname(
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '/'
): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 2 && LOCALES.includes(parts[0]) && parts[1] === parts[0]) {
    return '/' + parts.slice(1).join('/');
  }
  return pathname;
}

/**
 * Replace the URL query string while preserving the current pathname.
 * Works around manual locale-prefix math that can double-prefix the URL.
 */
export function replaceGenerationSearchParams(
  params: URLSearchParams | Record<string, string>
): void {
  if (typeof window === 'undefined') return;
  const search =
    params instanceof URLSearchParams ? params.toString() : new URLSearchParams(params).toString();
  const pathname = getGenerationPathname();
  const newUrl = search ? `${pathname}?${search}` : pathname;
  window.history.replaceState(null, '', newUrl);
}
