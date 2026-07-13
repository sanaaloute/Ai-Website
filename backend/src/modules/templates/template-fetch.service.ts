import { Injectable, Logger } from '@nestjs/common';
import JSZip from 'jszip';
import { env } from '@/config/env';

const GITHUB_API = 'https://api.github.com';

function timeoutSignal(ms: number): AbortSignal {
  // AbortSignal.timeout is available in Node 20+.
  return (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout(ms);
}

export interface FetchTemplateOptions {
  owner: string;
  repo: string;
  /** Branch / tag / commit. Defaults to 'main'. */
  ref?: string;
  /** Path inside the repo, e.g. `templates/b2b-saas/07-billing-invoicing`. */
  templatePath: string;
  /** Optional token for private repos / higher rate limits. */
  token?: string;
}

/** Metadata files describe the template but are not part of the scaffold. */
const METADATA_FILES = new Set(['template.json']);

/**
 * Extract the files under `templatePath` from a GitHub zipball archive.
 * Pure function (no I/O) so it can be unit-tested with a synthetic archive.
 *
 * GitHub zipball entries are prefixed with `<owner>-<repo>-<sha>/`, e.g.
 * `acme-Ai-Website-1a2b3c4/templates/b2b-saas/01-analytics-platform/package.json`.
 * Returned keys are paths relative to `templatePath` (forward slashes).
 */
export async function extractTemplateFromZip(
  buffer: Buffer,
  templatePath: string,
): Promise<Record<string, string>> {
  const zip = await JSZip.loadAsync(buffer);
  const prefix = `${templatePath}/`;
  const files: Record<string, string> = {};
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const firstSlash = name.indexOf('/');
    if (firstSlash === -1) continue;
    const repoRel = name.slice(firstSlash + 1);
    if (!repoRel.startsWith(prefix)) continue;
    const rel = repoRel.slice(prefix.length);
    if (!rel || rel.split('/').some((seg) => seg === '..' || seg === '')) continue;
    if (METADATA_FILES.has(rel.slice(rel.lastIndexOf('/') + 1))) continue;
    files[rel] = await entry.async('string');
  }
  if (Object.keys(files).length === 0) {
    throw new Error(`No files found under "${templatePath}" in the repository archive`);
  }
  return files;
}

/**
 * Downloads a single template subdirectory from a GitHub repo — without
 * cloning the whole repository. Uses the repo zipball endpoint and extracts
 * only the entries under the requested path.
 */
@Injectable()
export class TemplateFetchService {
  private readonly logger = new Logger(TemplateFetchService.name);

  /** True when TEMPLATE_REPO is configured ("owner/repo"). */
  get configured(): boolean {
    try {
      return !!env().templateRepo;
    } catch {
      return false;
    }
  }

  /**
   * Fetch a template path (e.g. `templates/b2b-saas/07-billing-invoicing`)
   * from the repo configured via TEMPLATE_REPO / TEMPLATE_REPO_REF / GITHUB_TOKEN.
   */
  async fetchTemplate(templatePath: string): Promise<Record<string, string>> {
    const e = env();
    if (!e.templateRepo) {
      throw new Error('TEMPLATE_REPO is not configured (expected "owner/repo")');
    }
    const [owner, repo] = e.templateRepo.split('/');
    if (!owner || !repo) {
      throw new Error(`Invalid TEMPLATE_REPO "${e.templateRepo}" (expected "owner/repo")`);
    }
    return this.fetchTemplateFiles({
      owner,
      repo,
      ref: e.templateRepoRef,
      templatePath,
      token: e.githubToken,
    });
  }

  /** Fetch a template subdirectory from an explicit GitHub repo. */
  async fetchTemplateFiles(opts: FetchTemplateOptions): Promise<Record<string, string>> {
    const { owner, repo, ref = 'main', token } = opts;
    const templatePath = opts.templatePath.replace(/^\/+|\/+$/g, '');
    if (
      !templatePath ||
      templatePath.split('/').some((seg) => seg === '..' || seg === '.' || seg === '')
    ) {
      throw new Error(`Invalid template path: ${opts.templatePath}`);
    }

    const url = `${GITHUB_API}/repos/${owner}/${repo}/zipball/${encodeURIComponent(ref)}`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'ai-website-backend',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    this.logger.log(`Fetching template "${templatePath}" from ${owner}/${repo}@${ref}`);
    const res = await fetch(url, { headers, signal: timeoutSignal(60_000), redirect: 'follow' });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `GitHub archive request failed: ${res.status} ${res.statusText} ${body.slice(0, 200)}`,
      );
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const files = await extractTemplateFromZip(buffer, templatePath);
    this.logger.log(
      `Fetched ${Object.keys(files).length} files for template "${templatePath}" from GitHub`,
    );
    return files;
  }
}
