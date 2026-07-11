import { E2BService } from '@/lib/e2b.service';

export function discoverRoutes(source: string, needsIntegration?: string | null): string[] {
  const routes: string[] = [];
  const pathRegex = /path\s*[:=]\s*['"`]([^'"`]+)['"`]/g;
  let match: RegExpExecArray | null;
  while ((match = pathRegex.exec(source)) !== null) {
    const routePath = match[1];
    if (routePath && !routes.includes(routePath)) {
      routes.push(routePath);
    }
  }
  if (routes.length === 0) {
    routes.push('/');
    // Any DB-backed template (PocketBase or Prisma) ships an admin area.
    if (needsIntegration) {
      routes.push('/admin');
    }
  }
  return routes;
}

const PAGE_FILE_RE = /^src\/app\/(.+\/)?page\.(tsx|ts|jsx|js)$/;

/** Map a Next.js App Router page file to its URL path (or null to skip). */
function pageFileToRoute(file: string): string | null {
  if (file.startsWith('src/app/api/')) return null;
  if (!PAGE_FILE_RE.test(file)) return null;
  let p = file
    .replace(/^src\/app\//, '')
    .replace(/\/page\.(tsx|ts|jsx|js)$/, '')
    .replace(/^page\.(tsx|ts|jsx|js)$/, '');
  if (!p) return '/';
  // Drop route-group segments like (marketing).
  p = p
    .split('/')
    .filter((seg) => !(seg.startsWith('(') && seg.endsWith(')')))
    .join('/');
  return '/' + p;
}

export async function readRoutes(e2b: E2BService, sandboxId: string): Promise<string> {
  let framework: 'next' | 'vite' = 'vite';
  try {
    framework = await e2b.detectFramework(sandboxId);
  } catch {
    framework = 'vite';
  }

  // Next.js: routes are filesystem-based. Enumerate page files and emit a
  // synthetic `path: '...'` source that discoverRoutes() already understands.
  if (framework === 'next') {
    try {
      const res = await e2b.runCommand(
        sandboxId,
        "find src/app -type f \\( -name 'page.tsx' -o -name 'page.ts' -o -name 'page.jsx' -o -name 'page.js' \\) 2>/dev/null | sort",
      );
      const files = res.output.split('\n').map((l) => l.trim()).filter(Boolean);
      const routes: string[] = [];
      for (const file of files) {
        const route = pageFileToRoute(file);
        if (route && !routes.includes(route)) routes.push(route);
      }
      if (routes.length) {
        return routes.map((r) => `path: '${r}'`).join('\n');
      }
    } catch {
      /* fall through to legacy fallback */
    }
  }

  // Vite (or fallback): most category templates hard-code routes in App.tsx.
  try {
    const content = await e2b.readFile(sandboxId, 'src/lib/routes.ts');
    if (content) return content;
  } catch {
    /* ignore */
  }
  try {
    const appContent = await e2b.readFile(sandboxId, 'src/App.tsx');
    if (appContent) return appContent;
  } catch {
    /* ignore */
  }

  return '';
}
