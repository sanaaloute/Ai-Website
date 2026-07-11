/**
 * Backend API configuration.
 * The external backend URL is set via NEXT_PUBLIC_BACKEND_URL.
 * All API calls are routed to this backend instead of local Next.js API routes.
 */

export function getBackendUrl(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (!url) {
    // Fallback for development — can be removed once env is configured
    if (typeof window !== 'undefined') {
      console.warn(
        '[backendConfig] NEXT_PUBLIC_BACKEND_URL is not set. Falling back to same-origin.'
      );
    }
    return '';
  }
  return url.replace(/\/$/, '');
}

export function backendApiUrl(path: string): string {
  const base = getBackendUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
