import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface PocketBaseTemplateFile {
  path: string;
  content: string;
}

export interface PocketBaseDeploymentFiles {
  files: PocketBaseTemplateFile[];
  adminEmail: string;
  adminPassword: string;
  frontendUrl: string;
  pocketbaseUrl: string;
  adminUrl: string;
}

export const DEFAULT_POCKETBASE_ADMIN_EMAIL = 'admin@lovecode.com';
// PocketBase requires passwords to be at least 8 characters.
export const DEFAULT_POCKETBASE_ADMIN_PASSWORD = 'admin@lovecode';

export interface RenderDeploymentOptions {
  projectName: string;
  domain: string;
  /** Prefix for the PocketBase subdomain (default: 'pb'). */
  pbSubdomainPrefix?: string;
  adminEmail?: string;
  adminPassword?: string;
}

@Injectable()
export class PocketbaseService {
  private readonly logger = new Logger(PocketbaseService.name);

  /**
   * Resolve the template directory whether running from TypeScript source
   * or compiled JavaScript in dist/.
   */
  private async resolveTemplateDir(category = 'ecommerce'): Promise<string> {
    // Deployment assets (Dockerfile, docker-compose.yaml, nginx.conf, pocketbase/)
    // now live inside each self-contained category template.
    const fromSource = path.resolve(process.cwd(), 'src', 'templates', category);
    const fromDist = path.resolve(process.cwd(), 'dist', 'templates', category);
    return (await this.directoryExists(fromDist)) ? fromDist : fromSource;
  }

  private async directoryExists(dir: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Return all template files (paths relative to the template root) and their contents.
   *
   * The deployment bundle is intentionally limited to the infra assets so the
   * storefront source (src/, package.json, ...) that also lives in the category
   * template is never shipped as part of a PocketBase deployment.
   */
  async getTemplateFiles(category = 'ecommerce'): Promise<PocketBaseTemplateFile[]> {
    const templateDir = await this.resolveTemplateDir(category);
    const files: PocketBaseTemplateFile[] = [];
    await this.collectFiles(templateDir, templateDir, files);
    return files.filter((file) => this.isDeploymentFile(file.path));
  }

  private isDeploymentFile(relPath: string): boolean {
    const normalized = relPath.replace(/\\/g, '/');
    return (
      normalized === 'Dockerfile' ||
      normalized === 'docker-compose.yaml' ||
      normalized === 'docker-compose.yml' ||
      normalized === 'nginx.conf' ||
      normalized.startsWith('pocketbase/')
    );
  }

  /**
   * Render deployment files for a specific domain, substituting placeholders.
   */
  async renderDeploymentFiles(options: RenderDeploymentOptions & { category?: string }): Promise<PocketBaseDeploymentFiles> {
    const { projectName, domain, category = 'ecommerce' } = options;
    const pbPrefix = options.pbSubdomainPrefix || 'pb';
    const pbDomain = `${pbPrefix}.${domain}`;
    const adminEmail = options.adminEmail || DEFAULT_POCKETBASE_ADMIN_EMAIL;
    const adminPassword = options.adminPassword || DEFAULT_POCKETBASE_ADMIN_PASSWORD;

    const templateFiles = await this.getTemplateFiles(category);
    const renderedFiles = templateFiles.map((file) => ({
      path: file.path,
      content: this.substitute(file.content, {
        PROJECT_NAME: projectName,
        DOMAIN: domain,
        PB_ADMIN_EMAIL: adminEmail,
        PB_ADMIN_PASSWORD: adminPassword,
        PB_URL: '/api',
        PB_DOMAIN: pbDomain,
        FRONTEND_URL: `https://${domain}`,
        ADMIN_URL: `https://${pbDomain}/_/`,
      }),
    }));

    return {
      files: renderedFiles,
      adminEmail,
      adminPassword,
      frontendUrl: `https://${domain}`,
      pocketbaseUrl: `https://${pbDomain}`,
      adminUrl: `https://${pbDomain}/_/`,
    };
  }

  /**
   * Return the PocketBase schema for a specific category as a JSON description.
   * The canonical source is the storefront template's `db_schema.json`, which is
   * also fed into the agent planner/executor/reviewer.
   */
  async getSchemaDescription(category = 'ecommerce'): Promise<Record<string, unknown>> {
    const fromDist = path.resolve(process.cwd(), 'dist', 'templates', category, 'db_schema.json');
    const fromSource = path.resolve(process.cwd(), 'src', 'templates', category, 'db_schema.json');
    const schemaPath = (await this.fileExists(fromDist)) ? fromDist : fromSource;
    try {
      const content = await fs.readFile(schemaPath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      this.logger.warn(`Could not read schema for category ${category}: ${err instanceof Error ? err.message : String(err)}`);
      return {};
    }
  }

  /**
   * Return the frontend SDK helper source code as a string so the AI agent can
   * include it verbatim in generated projects.
   */
  async getFrontendSdkSource(category = 'ecommerce'): Promise<string> {
    // The storefront template is the source of truth for the PocketBase client
    // because that is what gets copied into generated projects.
    const fromDist = path.resolve(process.cwd(), 'dist', 'templates', category, 'src', 'lib', 'pocketbase.ts');
    const fromSource = path.resolve(process.cwd(), 'src', 'templates', category, 'src', 'lib', 'pocketbase.ts');
    const sdkPath = (await this.fileExists(fromDist)) ? fromDist : fromSource;
    try {
      return await fs.readFile(sdkPath, 'utf-8');
    } catch (err) {
      this.logger.warn(`Could not read frontend SDK at ${sdkPath}: ${err instanceof Error ? err.message : String(err)}`);
      return '';
    }
  }

  private async fileExists(file: string): Promise<boolean> {
    try {
      const stat = await fs.stat(file);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  private substitute(content: string, vars: Record<string, string>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? `{{${key}}}`);
  }

  private async collectFiles(dir: string, rootDir: string, out: PocketBaseTemplateFile[]): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.collectFiles(fullPath, rootDir, out);
      } else if (entry.isFile()) {
        const relPath = path.relative(rootDir, fullPath);
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          out.push({ path: relPath, content });
        } catch (err) {
          this.logger.warn(`Skipping unreadable template file ${relPath}`);
        }
      }
    }
  }
}


export function generateSandboxPocketbaseCredentials(): { adminEmail: string; adminPassword: string } {
  return {
    adminEmail: DEFAULT_POCKETBASE_ADMIN_EMAIL,
    adminPassword: DEFAULT_POCKETBASE_ADMIN_PASSWORD,
  };
}
