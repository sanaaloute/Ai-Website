import { E2BService } from '@/lib/e2b.service';
import { AgentState } from '../state';

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

/**
 * Returns the cached route source from state when available, otherwise reads it
 * from the sandbox once and returns it. Callers should merge `routesSource` back
 * into state if they want to cache it for downstream nodes.
 */
export async function getRoutesSource(
  e2b: E2BService,
  sandboxId: string,
  state: AgentState,
): Promise<{ source: string; cached: boolean }> {
  if (state.routesSource) {
    return { source: state.routesSource, cached: true };
  }
  const source = await readRoutes(e2b, sandboxId);
  return { source, cached: false };
}
