import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readdirSync, readFileSync, promises as fs } from 'fs';
import * as path from 'path';

const TEMPLATE_CATEGORIES: Record<string, string> = {
  ecommerce: 'E-commerce store with product listings, cart, and checkout',
  education: 'Online course platform with lessons and progress tracking',
  saas: 'SaaS landing page with pricing, features, and testimonials',
  portfolio: 'Creative portfolio with projects gallery and contact',
  blog: 'Content blog with articles, categories, and search',
  restaurant: 'Restaurant website with menu, reservations, and gallery',
  real_estate: 'Real estate listings with property search and filters',
  health: 'Health & wellness platform with appointments and resources',
  travel: 'Travel agency with destinations, bookings, and itineraries',
  job_portal: 'Job board with listings, applications, and profiles',
  fashion: 'Fashion brand with lookbook, collections, and store',
  automobile: 'Car dealership with inventory, specs, and financing',
  personal: 'Personal website with bio, social links, and blog',
  generic: 'Generic multi-purpose landing page',
};


const MINIMAL_GENERIC_TEMPLATE_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'templates',
  'minimal-generic',
);

function collectFilesSync(
  dir: string,
  rootDir: string,
  out: Record<string, string>,
  skipDirs: Set<string>,
): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFilesSync(fullPath, rootDir, out, skipDirs);
    } else if (entry.isFile()) {
      const relPath = path.relative(rootDir, fullPath);
      if (entry.name === 'manifest.json') continue;
      out[relPath] = readFileSync(fullPath, 'utf-8');
    }
  }
}

function injectDeploymentFilesSync(files: Record<string, string>, templateDir: string): void {
  const sharedDir = path.join(templateDir, '..', '_shared');
  const deploymentFiles: Record<string, string> = {
    Dockerfile: 'Dockerfile',
    'docker-compose.yaml': 'docker-compose.yaml',
  };
  for (const [sharedName, targetName] of Object.entries(deploymentFiles)) {
    if (Object.prototype.hasOwnProperty.call(files, targetName)) {
      continue;
    }
    const filePath = path.join(sharedDir, sharedName);
    if (existsSync(filePath)) {
      try {
        files[targetName] = readFileSync(filePath, 'utf-8');
      } catch {
        // ignore unreadable shared files
      }
    }
  }
}

function loadMinimalGenericTemplate(): Record<string, string> {
  const candidates = [
    MINIMAL_GENERIC_TEMPLATE_DIR,
    path.resolve(process.cwd(), 'src', 'templates', 'minimal-generic'),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) {
      const files: Record<string, string> = {};
      try {
        collectFilesSync(
          dir,
          dir,
          files,
          new Set(['node_modules', '.git', '.next', 'dist', '.agent_state', '.playwright-mcp']),
        );
        if (Object.keys(files).length > 0) {
          injectDeploymentFilesSync(files, dir);
          return files;
        }
      } catch {
        // fall through to next candidate
      }
    }
  }
  return {};
}

export const MINIMAL_GENERIC_TEMPLATE: Record<string, string> = loadMinimalGenericTemplate();


@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templatesDir: string;
  private readonly skipDirs = new Set([
    'node_modules',
    '.git',
    '.next',
    'dist',
    '.agent_state',
    '.playwright-mcp',
  ]);

  /**
   * In-memory cache of template payloads. Templates are immutable on disk during
   * a deployment, so caching them avoids repeated disk reads on every new project.
   */
  private readonly fileCache = new Map<string, Record<string, string>>();
  private readonly manifestCache = new Map<string, Record<string, unknown>>();
  private readonly schemaCache = new Map<string, Record<string, unknown>>();

  constructor() {
    // Resolve templates relative to the project root, preferring the compiled dist/
    // output when it exists so the Docker image works without source files.
    const fromDist = path.resolve(process.cwd(), 'dist', 'templates');
    const fromSource = path.resolve(process.cwd(), 'src', 'templates');
    this.templatesDir = existsSync(fromDist) ? fromDist : fromSource;
  }

  listCategories(): Record<string, string> {
    return { ...TEMPLATE_CATEGORIES };
  }

  async getTemplateFiles(category: string): Promise<Record<string, string>> {
    const cached = this.fileCache.get(category);
    if (cached) return { ...cached };

    const templateDir = this.resolveCategoryDir(category);
    try {
      const files: Record<string, string> = {};
      await this.collectFiles(templateDir, templateDir, files);
      const result = this.injectSharedFiles(files);
      this.fileCache.set(category, result);
      return { ...result };
    } catch (err) {
      this.logger.warn(`Could not read template directory ${templateDir}: ${err instanceof Error ? err.message : String(err)}`);
      return {};
    }
  }

  async getTemplateManifest(category: string): Promise<Record<string, unknown>> {
    const cached = this.manifestCache.get(category);
    if (cached) return { ...cached };

    const manifestPath = path.join(this.resolveCategoryDir(category), 'manifest.json');
    try {
      const content = await fs.readFile(manifestPath, 'utf-8');
      const parsed = JSON.parse(content);
      this.manifestCache.set(category, parsed);
      return { ...parsed };
    } catch {
      const fallback = {
        name: category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        category,
        recommended_packages: ['react', 'react-dom', 'lucide-react', 'pocketbase'],
      };
      this.manifestCache.set(category, fallback);
      return { ...fallback };
    }
  }

  async getDbSchema(category: string): Promise<Record<string, unknown>> {
    const cached = this.schemaCache.get(category);
    if (cached) return { ...cached };

    const schemaPath = path.join(this.resolveCategoryDir(category), 'db_schema.json');
    try {
      const content = await fs.readFile(schemaPath, 'utf-8');
      const parsed = JSON.parse(content);
      this.schemaCache.set(category, parsed);
      return { ...parsed };
    } catch {
      this.schemaCache.set(category, {});
      return {};
    }
  }

  async getGenericTemplate(): Promise<Record<string, string>> {
    const genericDir = path.join(this.templatesDir, 'generic');
    try {
      await fs.access(genericDir);
      const files: Record<string, string> = {};
      await this.collectFiles(genericDir, genericDir, files);
      if (Object.keys(files).length > 0) return this.injectSharedFiles(files);
    } catch {
      // fall through
    }

    const minimalDir = path.join(this.templatesDir, 'minimal-generic');
    try {
      await fs.access(minimalDir);
      const files: Record<string, string> = {};
      await this.collectFiles(minimalDir, minimalDir, files);
      if (Object.keys(files).length > 0) return this.injectSharedFiles(files);
    } catch {
      // fall through
    }

    const minimal = { ...MINIMAL_GENERIC_TEMPLATE };
    return this.injectSharedFiles(minimal);
  }

  private resolveCategoryDir(category: string): string {
    return path.join(this.templatesDir, category);
  }

  private async collectFiles(dir: string, rootDir: string, out: Record<string, string>): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (this.skipDirs.has(entry.name)) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.collectFiles(fullPath, rootDir, out);
      } else if (entry.isFile()) {
        const relPath = path.relative(rootDir, fullPath);
        if (entry.name === 'manifest.json') continue;
        try {
          out[relPath] = await fs.readFile(fullPath, 'utf-8');
        } catch (err) {
          this.logger.warn(`Skipping unreadable template file ${relPath}`);
        }
      }
    }
  }

  /**
   * Injects shared files into a template: the AI-Website visual-editing bridge and
   * deployment-ready Docker assets.
   *
   * Adds:
   *  - public/ai-website-editor-bridge.js (the client-side selector + editor)
   *  - a <script src="/ai-website-editor-bridge.js"></script> tag before </body> in index.html
   *  - Dockerfile
   *  - docker-compose.yaml
   */
  private injectSharedFiles(files: Record<string, string>): Record<string, string> {
    const result = { ...files };

    const bridgePath = path.join(this.templatesDir, '_shared', 'ai-website-editor-bridge.js');
    let bridgeContent: string | null = null;
    try {
      bridgeContent = existsSync(bridgePath) ? readFileSync(bridgePath, 'utf-8') : null;
    } catch (err) {
      this.logger.warn(
        `Could not read visual-editing bridge ${bridgePath}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (bridgeContent) {
      // Add the bridge as a static public asset.
      result['public/ai-website-editor-bridge.js'] = bridgeContent;

      // Inject the script tag into index.html if it exists and has not already been injected.
      const indexHtml = result['index.html'];
      if (indexHtml && !indexHtml.includes('ai-website-editor-bridge.js')) {
        result['index.html'] = indexHtml.replace(
          '</body>',
          '  <script src="/ai-website-editor-bridge.js"></script>\n  </body>'
        );
      }
    }

    // Inject deployment files from the shared folder.
    const sharedDir = path.join(this.templatesDir, '_shared');
    const deploymentFiles: Record<string, string> = {
      Dockerfile: 'Dockerfile',
      'docker-compose.yaml': 'docker-compose.yaml',
    };
    for (const [sharedName, targetName] of Object.entries(deploymentFiles)) {
      if (Object.prototype.hasOwnProperty.call(result, targetName)) {
        continue;
      }
      const filePath = path.join(sharedDir, sharedName);
      if (existsSync(filePath)) {
        try {
          result[targetName] = readFileSync(filePath, 'utf-8');
        } catch (err) {
          this.logger.warn(
            `Could not read shared deployment file ${filePath}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    return result;
  }
}
