import { Injectable, Logger } from '@nestjs/common';
import { existsSync, promises as fs } from 'fs';
import * as path from 'path';
import { env } from '@/config/env';

export interface TemplateMeta {
  id: string;
  name: string;
  path: string;
  subcategory?: string;
  description?: string;
  tags?: string[];
  primaryColor?: string;
  framework?: string;
  styling?: string;
}

export interface CategoryCatalog {
  category: string;
  label: string;
  description?: string;
  framework?: string;
  styling?: string;
  templates: TemplateMeta[];
}

/** Directories that never belong to a scaffolded template. */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'out',
  '.agent_state',
  '.playwright-mcp',
]);

/** Metadata files describe the template but are not part of the scaffold. */
const METADATA_FILES = new Set(['template.json']);

const SAFE_SEGMENT = /^[a-zA-Z0-9_.-]+$/;

/**
 * Reads the user-facing template catalog from the repo-root `templates/`
 * directory (categories with `index.json` + per-template `template.json`).
 *
 * This is the LOCAL source of truth used in development / monorepo deploys.
 * When the backend runs without the templates directory (e.g. a slim Docker
 * image), `available` is false and callers should use TemplateFetchService
 * to pull templates from GitHub instead.
 */
@Injectable()
export class TemplateCatalogService {
  private readonly logger = new Logger(TemplateCatalogService.name);
  private readonly templatesDir: string | null;

  constructor() {
    this.templatesDir = this.resolveTemplatesDir();
    if (this.templatesDir) {
      this.logger.log(`Templates catalog directory: ${this.templatesDir}`);
    } else {
      this.logger.warn(
        'No local templates directory found — catalog endpoints will be empty and template fetch will require GitHub (TEMPLATE_REPO)',
      );
    }
  }

  get available(): boolean {
    return this.templatesDir !== null;
  }

  get dir(): string | null {
    return this.templatesDir;
  }

  private resolveTemplatesDir(): string | null {
    let override: string | undefined;
    try {
      override = env().templatesDir;
    } catch {
      // env() can throw when required vars are missing (e.g. in bare scripts)
    }
    const candidates = [
      override,
      // backend runs with cwd=backend/ → repo root is one level up
      path.resolve(process.cwd(), '..', 'templates'),
      // fallback: cwd is already the repo root
      path.resolve(process.cwd(), 'templates'),
    ].filter((d): d is string => !!d);
    for (const dir of candidates) {
      if (existsSync(dir)) return dir;
    }
    return null;
  }

  /** All category catalogs (`templates/<category>/index.json`). */
  async listCategories(): Promise<CategoryCatalog[]> {
    if (!this.templatesDir) return [];
    let entries: string[];
    try {
      entries = await fs.readdir(this.templatesDir);
    } catch {
      return [];
    }
    const catalogs: CategoryCatalog[] = [];
    for (const entry of entries) {
      const catalog = await this.getCategory(entry);
      if (catalog) catalogs.push(catalog);
    }
    return catalogs;
  }

  /** One category catalog, or null when it does not exist / is invalid. */
  async getCategory(category: string): Promise<CategoryCatalog | null> {
    if (!this.templatesDir || !SAFE_SEGMENT.test(category)) return null;
    const indexPath = path.join(this.templatesDir, category, 'index.json');
    try {
      const raw = await fs.readFile(indexPath, 'utf-8');
      const parsed = JSON.parse(raw) as CategoryCatalog;
      if (!parsed || typeof parsed.category !== 'string' || !Array.isArray(parsed.templates)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Find a template inside a category by its directory path (`07-billing-invoicing`)
   * or by its catalog id (`b2b-saas-billing-invoicing`).
   */
  async findTemplate(category: string, template: string): Promise<TemplateMeta | null> {
    const catalog = await this.getCategory(category);
    if (!catalog || !SAFE_SEGMENT.test(template)) return null;
    return (
      catalog.templates.find((t) => t.path === template || t.id === template) ?? null
    );
  }

  /** `templates/<category>/<path>/template.json` metadata. */
  async getTemplateMeta(category: string, templatePath: string): Promise<Record<string, unknown> | null> {
    if (!this.templatesDir || !SAFE_SEGMENT.test(category) || !SAFE_SEGMENT.test(templatePath)) {
      return null;
    }
    try {
      const raw = await fs.readFile(
        path.join(this.templatesDir, category, templatePath, 'template.json'),
        'utf-8',
      );
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Collect a local template directory into a `{ relativePath: content }` map
   * (forward-slash paths), skipping build artifacts and metadata files.
   * Returns null when the template directory is missing.
   */
  async getLocalTemplateFiles(
    category: string,
    templatePath: string,
  ): Promise<Record<string, string> | null> {
    if (!this.templatesDir || !SAFE_SEGMENT.test(category) || !SAFE_SEGMENT.test(templatePath)) {
      return null;
    }
    const dir = path.join(this.templatesDir, category, templatePath);
    if (!existsSync(dir)) return null;
    const files: Record<string, string> = {};
    await this.collectFiles(dir, dir, files);
    if (Object.keys(files).length === 0) return null;
    return files;
  }

  private async collectFiles(
    dir: string,
    rootDir: string,
    out: Record<string, string>,
  ): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.collectFiles(fullPath, rootDir, out);
      } else if (entry.isFile()) {
        if (METADATA_FILES.has(entry.name)) continue;
        const relPath = path.relative(rootDir, fullPath).split(path.sep).join('/');
        try {
          out[relPath] = await fs.readFile(fullPath, 'utf-8');
        } catch {
          this.logger.warn(`Skipping unreadable template file ${relPath}`);
        }
      }
    }
  }
}
