/** Normalize path to forward slashes (cross-platform). */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}
