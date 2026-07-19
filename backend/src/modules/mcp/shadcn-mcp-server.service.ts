import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { E2BService } from '@/lib/e2b.service';

export interface ShadcnRegistryItem {
  name: string;
  type: string;
  title?: string;
  description?: string;
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  files?: Array<{ path: string; type: string; content?: string }>;
}

export interface ShadcnRegistry {
  name: string;
  homepage: string;
  items: ShadcnRegistryItem[];
}

export interface ShadcnSearchResult {
  items: ShadcnRegistryItem[];
}

export const shadcnSearchSchema = z.object({
  query: z.string().describe('Search term for shadcn/ui registry items (component, block, hook, etc.).'),
  limit: z.number().optional().describe('Maximum number of results to return (default 10).'),
});

export const shadcnViewSchema = z.object({
  name: z.string().describe('Exact registry item name, e.g. "button" or "login-form".'),
});

export const shadcnInstallSchema = z.object({
  name: z.string().describe('Exact registry item name to install, e.g. "button".'),
});

export const shadcnInitSchema = z.object({
  baseColor: z.enum(['slate', 'gray', 'zinc', 'neutral', 'stone']).optional().describe('Base color for the shadcn/ui theme (default slate).'),
});

@Injectable()
export class ShadcnMcpServerService {
  private readonly logger = new Logger(ShadcnMcpServerService.name);
  private readonly baseUrl = 'https://ui.shadcn.com/r';
  private readonly registryStyle = 'new-york';
  private readonly cacheTtlMs = 5 * 60 * 1000;
  private registryCache: { data: ShadcnRegistry; expiresAt: number } | null = null;

  constructor(private readonly e2b: E2BService) {}

  private async fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Shadcn registry request failed (${res.status}): ${body}`);
    }
    return res.json() as Promise<T>;
  }

  private async getRegistry(): Promise<ShadcnRegistry> {
    if (this.registryCache && Date.now() < this.registryCache.expiresAt) {
      return this.registryCache.data;
    }
    // The current shadcn registry catalog is a flat array at /r/index.json.
    const items = await this.fetchJson<ShadcnRegistryItem[]>(`${this.baseUrl}/index.json`);
    const data: ShadcnRegistry = { name: 'shadcn/ui', homepage: 'https://ui.shadcn.com', items };
    this.registryCache = { data, expiresAt: Date.now() + this.cacheTtlMs };
    return data;
  }

  async searchRegistry(args: { query: string; limit?: number }): Promise<ShadcnSearchResult> {
    try {
      const registry = await this.getRegistry();
      const query = args.query.toLowerCase();
      const limit = args.limit ?? 10;
      const items = registry.items
        .filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            (item.title?.toLowerCase().includes(query) ?? false) ||
            (item.description?.toLowerCase().includes(query) ?? false),
        )
        .slice(0, limit);
      return { items };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`searchRegistry failed: ${message}`);
      throw new Error(`Shadcn search failed: ${message}`);
    }
  }

  async viewItem(args: { name: string }): Promise<ShadcnRegistryItem> {
    try {
      return await this.fetchJson<ShadcnRegistryItem>(
        `${this.baseUrl}/styles/${this.registryStyle}/${args.name}.json`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`viewItem failed for ${args.name}: ${message}`);
      throw new Error(`Shadcn view failed: ${message}`);
    }
  }

  async installItem(sandboxId: string, name: string): Promise<string> {
    const res = await this.e2b.runCommand(
      sandboxId,
      `npx shadcn@latest add -y -o ${name}`,
      '/home/user/app',
      { timeoutMs: 5 * 60 * 1000 },
    );
    if (res.exitCode !== 0) {
      throw new Error(`shadcn add failed: ${res.error || res.output}`);
    }
    return res.output;
  }

  /**
   * Deterministic batch install: one CLI invocation for the whole list instead
   * of N model-driven `shadcn_install` tool calls (which also risked
   * interactive-prompt stalls). Component names are validated against the
   * registry-name shape before being embedded in the command.
   */
  async installItems(sandboxId: string, names: string[]): Promise<{ installed: string[]; output: string }> {
    const valid = names.filter((n) => /^[a-z0-9][a-z0-9-]*$/.test(n));
    if (!valid.length) return { installed: [], output: 'No valid component names' };
    const res = await this.e2b.runCommand(
      sandboxId,
      `npx shadcn@latest add -y -o ${valid.join(' ')}`,
      '/home/user/app',
      { timeoutMs: 5 * 60 * 1000 },
    );
    if (res.exitCode !== 0) {
      throw new Error(`shadcn add failed: ${res.error || res.output}`);
    }
    return { installed: valid, output: res.output };
  }

  async initShadcn(sandboxId: string, baseColor = 'slate'): Promise<string> {
    const res = await this.e2b.runCommand(
      sandboxId,
      `npx shadcn@latest init -y -d --base-color ${baseColor}`,
      '/home/user/app',
      { timeoutMs: 5 * 60 * 1000 },
    );
    if (res.exitCode !== 0) {
      throw new Error(`shadcn init failed: ${res.error || res.output}`);
    }
    return res.output;
  }
}
