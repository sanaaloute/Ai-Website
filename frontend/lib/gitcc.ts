/**
 * Ensure a GitHub repo URL is absolute. Paths like "elsone/wine-city.git"
 * are expanded to "https://www.gitcc.com/elsone/wine-city.git".
 * Already absolute URLs (HTTPS or SSH) are returned unchanged.
 */
export function normalizeGitccRepoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^(https?:|git@)/i.test(trimmed)) return trimmed;
  const base = 'https://www.gitcc.com';
  const path = trimmed.replace(/^\/+/, '');
  return `${base}/${path}`;
}
