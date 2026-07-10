import * as path from 'path';
import { FORBIDDEN_PATH_PREFIXES } from '@/lib/e2b.service';

const PROTECTED_PATHS = new Set([
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'postcss.config.js',
  'tailwind.config.ts',
  'index.html',
]);

export interface FileStatus {
  path: string;
  status: 'created' | 'modified' | 'deleted';
  lastModified: string;
}

/**
 * Tracks file changes made by the agent and protects critical scaffold files.
 */
export class FileManifest {
  private readonly files = new Map<string, FileStatus>();

  isProtected(filePath: string): boolean {
    const normalized = this.normalizePath(filePath);
    if (PROTECTED_PATHS.has(normalized)) {
      return true;
    }
    // Generated/managed directories are off-limits to the agent.
    return FORBIDDEN_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  }

  async updateFile(filePath: string, status: 'created' | 'modified' | 'deleted'): Promise<void> {
    const normalized = this.normalizePath(filePath);
    this.files.set(normalized, {
      path: normalized,
      status,
      lastModified: new Date().toISOString(),
    });
  }

  getFileStatus(filePath: string): { path: string; status?: string; lastModified?: string } {
    const normalized = this.normalizePath(filePath);
    const entry = this.files.get(normalized);
    return {
      path: normalized,
      status: entry?.status,
      lastModified: entry?.lastModified,
    };
  }

  listChanged(): FileStatus[] {
    return Array.from(this.files.values());
  }

  getProtectedPaths(): string[] {
    return Array.from(PROTECTED_PATHS);
  }

  private normalizePath(filePath: string): string {
    return normalizeFilePath(filePath);
  }
}

/**
 * Normalize a file path relative to the app workspace root.
 * Strips the workspace prefix, leading slashes, and collapses ./ and ..
 * so that protected-path checks cannot be bypassed with relative tricks.
 */
export function normalizeFilePath(filePath: string): string {
  const withoutWorkspacePrefix = filePath
    .replace(/^\/home\/user\/app\//, '')
    .replace(/^\//, '');
  const normalized = path.posix.normalize(withoutWorkspacePrefix);
  return normalized.replace(/^\.\//, '');
}

/**
 * Enforce TypeScript source-file extensions.
 * - `.jsx` (anywhere) → `.tsx`
 * - `.js` under `src/` → `.ts`
 *
 * Config files at the project root (e.g. `postcss.config.js`) are left untouched.
 */
export function ensureTypeScriptExtension(filePath: string): string {
  const normalized = normalizeFilePath(filePath);
  if (normalized.endsWith('.jsx')) {
    return normalized.slice(0, -4) + '.tsx';
  }
  if (normalized.startsWith('src/') && normalized.endsWith('.js')) {
    return normalized.slice(0, -3) + '.ts';
  }
  return filePath;
}
