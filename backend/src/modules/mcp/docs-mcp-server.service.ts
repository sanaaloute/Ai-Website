import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { env } from '@/config/env';

export interface DocsToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

const FRAMEWORK_LIBRARY_IDS: Record<string, string> = {
  react: '/react/react',
  vite: '/vitejs/vite',
  next: '/vercel/next.js',
  nextjs: '/vercel/next.js',
  prisma: '/prisma/prisma',
  node: '/nodejs/node',
  nodejs: '/nodejs/node',
  pocketbase: '/pocketbase/pocketbase',
  playwright: '/microsoft/playwright',
};

const SHORTCUT_LIBRARY_IDS: Record<string, string> = {
  shadcn: '/shadcn-ui/ui',
  tailwind: '/tailwindlabs/tailwindcss.com',
  framer_motion: '/grx7/framer-motion',
  zod: '/colinhacks/zod',
  react_hook_form: '/react-hook-form/react-hook-form',
  supabase_js: '/supabase/supabase-js',
  stripe: '/stripe/stripe-js',
};

interface CacheEntry {
  value: string;
  expiresAt: number;
}

/**
 * Extract the `redirectUrl` from a Context7 `library_redirected` error, if any.
 * fetchText embeds the JSON error body in the error message, e.g.
 * `Context7 request failed (301): {"error":"library_redirected",...,"redirectUrl":"/org/lib"}`.
 */
function extractRedirectUrl(err: unknown): string | null {
  const message = err instanceof Error ? err.message : String(err);
  if (!message.includes('library_redirected')) return null;
  const jsonStart = message.indexOf('{');
  if (jsonStart < 0) return null;
  try {
    const body = JSON.parse(message.slice(jsonStart)) as { redirectUrl?: unknown };
    return typeof body.redirectUrl === 'string' && body.redirectUrl.length > 0
      ? body.redirectUrl
      : null;
  } catch {
    return null;
  }
}

@Injectable()
export class DocsMcpServerService {
  private readonly logger = new Logger(DocsMcpServerService.name);
  private readonly cache = new Map<string, CacheEntry>();

  private get apiKey(): string | undefined {
    return env().context7ApiKey;
  }

  private get cacheTtlMs(): number {
    return Math.max(0, env().mcpDocsCacheTtlSeconds) * 1000;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private getCache(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private setCache(key: string, value: string): void {
    if (this.cacheTtlMs <= 0) return;
    this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });
  }

  private async fetchJson(url: string): Promise<unknown> {
    const res = await fetch(url, { headers: this.buildHeaders() });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Context7 request failed (${res.status}): ${body}`);
    }
    return res.json();
  }

  private async fetchText(url: string): Promise<string> {
    const res = await fetch(url, { headers: this.buildHeaders() });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Context7 request failed (${res.status}): ${body}`);
    }
    return res.text();
  }

  async resolveLibrary(args: { query: string; libraryName: string }): Promise<DocsToolResult> {
    try {
      const cacheKey = `resolve:${args.libraryName}:${args.query}`;
      const cached = this.getCache(cacheKey);
      if (cached) {
        return { content: [{ type: 'text', text: cached }] };
      }

      const url = `https://api.context7.com/v1/resolve?query=${encodeURIComponent(args.query)}&libraryName=${encodeURIComponent(args.libraryName)}&limit=10`;
      const data = await this.fetchJson(url);
      const text = JSON.stringify(data, null, 2);
      this.setCache(cacheKey, text);
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`resolveLibrary failed: ${message}`);
      return { content: [{ type: 'text', text: `Error resolving library: ${message}` }], isError: true };
    }
  }

  async queryDocs(args: { libraryId: string; query: string; tokens?: number }): Promise<DocsToolResult> {
    try {
      const tokens = args.tokens ?? 3000;
      const cacheKey = `docs:${args.libraryId}:${args.query}:${tokens}`;
      const cached = this.getCache(cacheKey);
      if (cached) {
        return { content: [{ type: 'text', text: cached }] };
      }

      // Prefer the v1 per-library endpoint; fall back to v2/context if it fails.
      // If Context7 reports the library was redirected (301 library_redirected),
      // retry once with the redirect target so moved libraries keep working.
      let libraryId = args.libraryId;
      let text: string | undefined;
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        const normalizedId = libraryId.replace(/^\//, '');
        const v1Url = `https://context7.com/api/v1/${normalizedId}?tokens=${tokens}&topic=${encodeURIComponent(args.query)}`;
        try {
          try {
            text = await this.fetchText(v1Url);
          } catch (v1Err) {
            const v2Url = `https://context7.com/api/v2/context?libraryId=${encodeURIComponent(libraryId)}&query=${encodeURIComponent(args.query)}&tokens=${tokens}`;
            text = await this.fetchText(v2Url);
          }
          break;
        } catch (err) {
          lastError = err;
          const redirectUrl = extractRedirectUrl(err);
          if (redirectUrl && attempt === 0) {
            this.logger.log(`Context7 library ${libraryId} redirected to ${redirectUrl}; retrying`);
            libraryId = redirectUrl;
            continue;
          }
          throw err;
        }
      }
      if (text === undefined) {
        throw lastError instanceof Error ? lastError : new Error(String(lastError));
      }

      this.setCache(cacheKey, text);
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`queryDocs failed: ${message}`);
      return { content: [{ type: 'text', text: `Error querying docs: ${message}` }], isError: true };
    }
  }

  async frameworkDocs(args: { framework: string; query: string; tokens?: number }): Promise<DocsToolResult> {
    const libraryId = FRAMEWORK_LIBRARY_IDS[args.framework.toLowerCase()];
    if (!libraryId) {
      return {
        content: [{ type: 'text', text: `Unknown framework "${args.framework}". Use context7_query_docs with a libraryId, or one of: ${Object.keys(FRAMEWORK_LIBRARY_IDS).join(', ')}.` }],
        isError: true,
      };
    }
    return this.queryDocs({ libraryId, query: args.query, tokens: args.tokens });
  }

  // Convenience shortcuts that agents can call directly.
  async reactDocs(args: { query: string; tokens?: number }): Promise<DocsToolResult> {
    return this.frameworkDocs({ framework: 'react', query: args.query, tokens: args.tokens });
  }

  async viteDocs(args: { query: string; tokens?: number }): Promise<DocsToolResult> {
    return this.frameworkDocs({ framework: 'vite', query: args.query, tokens: args.tokens });
  }

  async nodeDocs(args: { query: string; tokens?: number }): Promise<DocsToolResult> {
    return this.frameworkDocs({ framework: 'node', query: args.query, tokens: args.tokens });
  }

  async pocketbaseDocs(args: { query: string; tokens?: number }): Promise<DocsToolResult> {
    return this.frameworkDocs({ framework: 'pocketbase', query: args.query, tokens: args.tokens });
  }

  async playwrightDocs(args: { query: string; tokens?: number }): Promise<DocsToolResult> {
    return this.frameworkDocs({ framework: 'playwright', query: args.query, tokens: args.tokens });
  }

  async shortcutDocs(
    key: string,
    args: { query: string; tokens?: number },
  ): Promise<DocsToolResult> {
    const libraryId = SHORTCUT_LIBRARY_IDS[key];
    if (!libraryId) {
      return {
        content: [{ type: 'text', text: `Unknown docs shortcut "${key}".` }],
        isError: true,
      };
    }
    return this.queryDocs({ libraryId, query: args.query, tokens: args.tokens });
  }

  async shadcnDocs(args: { query: string; tokens?: number }): Promise<DocsToolResult> {
    return this.shortcutDocs('shadcn', args);
  }

  async tailwindDocs(args: { query: string; tokens?: number }): Promise<DocsToolResult> {
    return this.shortcutDocs('tailwind', args);
  }

  async framerMotionDocs(args: { query: string; tokens?: number }): Promise<DocsToolResult> {
    return this.shortcutDocs('framer_motion', args);
  }

  async zodDocs(args: { query: string; tokens?: number }): Promise<DocsToolResult> {
    return this.shortcutDocs('zod', args);
  }

  async reactHookFormDocs(args: { query: string; tokens?: number }): Promise<DocsToolResult> {
    return this.shortcutDocs('react_hook_form', args);
  }

  async supabaseJsDocs(args: { query: string; tokens?: number }): Promise<DocsToolResult> {
    return this.shortcutDocs('supabase_js', args);
  }

  async stripeDocs(args: { query: string; tokens?: number }): Promise<DocsToolResult> {
    return this.shortcutDocs('stripe', args);
  }
}

// Zod schemas for the high-level MCP server and for LangChain tool wrapping.
export const resolveLibrarySchema = z.object({
  query: z.string().describe('The user task or question, used to rank library matches.'),
  libraryName: z.string().describe('The library name to resolve, e.g. "React" or "PocketBase".'),
});

export const queryDocsSchema = z.object({
  libraryId: z.string().describe('A Context7-compatible library ID, e.g. /facebook/react.'),
  query: z.string().describe('The specific API or topic to look up.'),
  tokens: z.number().optional().describe('Maximum tokens of documentation to retrieve (default 3000).'),
});

export const frameworkDocsSchema = z.object({
  framework: z.enum(['react', 'vite', 'next', 'nextjs', 'prisma', 'node', 'nodejs', 'pocketbase', 'playwright']).describe('Framework shorthand.'),
  query: z.string().describe('The specific API or topic to look up.'),
  tokens: z.number().optional().describe('Maximum tokens of documentation to retrieve (default 3000).'),
});

export const singleFrameworkDocsSchema = (framework: string) =>
  z.object({
    query: z.string().describe(`The specific ${framework} API or topic to look up.`),
    tokens: z.number().optional().describe('Maximum tokens of documentation to retrieve (default 3000).'),
  });
