import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '@/lib/storage.service';

export interface AiWebsiteDeploymentMetadata {
  platform?: string;
  githubRepoUrl?: string;
  vercelProjectId?: string;
  vercelDomainUrl?: string;
  vercelDeployedAt?: string;
  pocketbaseUrl?: string;
  pocketbaseAdminUrl?: string;
}

export interface AiWebsiteProjectMetadata {
  uuid?: string;
  name?: string;
  siteTitle?: string;
}

export interface UpsertAiWebsiteJsonOptions {
  project?: AiWebsiteProjectMetadata;
  deployment?: AiWebsiteDeploymentMetadata;
  snapshot?: Record<string, unknown>;
}

interface AiWebsiteJson {
  project: {
    uuid: string;
    name: string;
    siteTitle: string;
  };
  deployment: {
    platform: string;
    note?: string;
    githubRepoUrl?: string;
    vercelProjectId?: string;
    vercelDomainUrl?: string;
    vercelDeployedAt?: string;
    pocketbaseUrl?: string;
    pocketbaseAdminUrl?: string;
  };
}

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(private readonly storage: StorageService) {}

  /**
   * Ensures `ai-website.json` exists in the stored project snapshot and file tree.
   * Preserves the existing project UUID and merges new project/deployment metadata.
   * Should be called after the project row is created/updated in Supabase.
   */
  async upsertAiWebsiteJson(
    userId: string,
    projectId: string,
    options: UpsertAiWebsiteJsonOptions = {}
  ): Promise<{ content: string; snapshot: Record<string, unknown> } | null> {
    const snapshot =
      options.snapshot ?? (await this.storage.downloadLatest(userId, projectId));
    const sandboxFiles =
      (snapshot?.sandboxFiles as Record<string, string> | undefined) ?? {};

    let existing: AiWebsiteJson | undefined;
    try {
      const raw = sandboxFiles['ai-website.json'];
      if (raw) {
        existing = JSON.parse(raw) as AiWebsiteJson;
      }
    } catch {
      // ignore parse errors
    }

    const projectUuid =
      options?.project?.uuid || existing?.project?.uuid || projectId;
    const existingName = existing?.project?.name?.trim();
    const providedName = options?.project?.name?.trim();
    const providedSiteTitle = options?.project?.siteTitle?.trim();

    // Never use the raw UUID as a display name.
    const projectName =
      providedName ||
      (existingName && existingName !== projectId ? existingName : undefined) ||
      'Untitled Project';
    const siteTitle =
      providedSiteTitle ||
      existing?.project?.siteTitle?.trim() ||
      projectName;

    const mergedDeployment: AiWebsiteJson['deployment'] = {
      platform: 'vercel',
      note: 'Deployment info is stored in AI-Website cloud after first deploy',
      ...existing?.deployment,
      ...options?.deployment,
    };

    const aiWebsite: AiWebsiteJson = {
      project: {
        uuid: projectUuid,
        name: projectName,
        siteTitle,
      },
      deployment: mergedDeployment,
    };

    const content = JSON.stringify(aiWebsite, null, 2);

    const updatedSnapshot = {
      ...snapshot,
      sandboxFiles: {
        ...sandboxFiles,
        'ai-website.json': content,
      },
    };

    const [latestPath, filePath] = await Promise.all([
      this.storage.uploadLatest(userId, projectId, updatedSnapshot),
      this.storage.uploadFile(userId, projectId, 'ai-website.json', content),
    ]);

    if (!latestPath || !filePath) {
      this.logger.warn(
        `Failed to persist ai-website.json for project ${projectId}: latest=${latestPath}, file=${filePath}`
      );
      return null;
    }

    return { content, snapshot: updatedSnapshot };
  }

  /**
   * Reads the existing `ai-website.json` from the stored project snapshot.
   * Returns the parsed content or null if the file is missing or malformed.
   */
  async readAiWebsiteJson(userId: string, projectId: string): Promise<AiWebsiteJson | null> {
    try {
      const snapshot = await this.storage.downloadLatest(userId, projectId);
      const sandboxFiles =
        (snapshot?.sandboxFiles as Record<string, string> | undefined) ?? {};
      const raw = sandboxFiles['ai-website.json'];
      if (!raw) return null;
      return JSON.parse(raw) as AiWebsiteJson;
    } catch {
      return null;
    }
  }
}
