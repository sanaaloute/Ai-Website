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
    if (needsIntegration === 'pocketbase') {
      routes.push('/admin');
    }
  }
  return routes;
}

export async function readRoutes(e2b: E2BService, sandboxId: string): Promise<string> {
  try {
    const content = await e2b.readFile(sandboxId, 'src/lib/routes.ts');
    if (content) return content;
  } catch {
    /* ignore */
  }

  // Fallback: most category templates hard-code routes in App.tsx.
  try {
    const appContent = await e2b.readFile(sandboxId, 'src/App.tsx');
    if (appContent) return appContent;
  } catch {
    /* ignore */
  }

  return '';
}
