import { Injectable, Logger } from '@nestjs/common';
import { env } from '@/config/env';
import { OpenhostService } from './openhost.service';
import { generateSshKeyPair } from './ssh-key.util';

function timeoutSignal(ms: number): AbortSignal {
  // AbortSignal.timeout is available in Node 20+.
  return (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout(ms);
}

interface PushFile {
  path: string;
  content: string;
}

interface TokenPair {
  access_token: string;
  refresh_token?: string;
}

interface GitlabUser {
  id: number;
  username: string;
}

interface GitlabProject {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  web_url: string;
  ssh_url_to_repo: string;
  http_url_to_repo: string;
  visibility: 'private' | 'internal' | 'public';
  default_branch?: string;
}

interface GitlabTreeItem {
  name: string;
  type: 'blob' | 'tree';
  path: string;
}

export interface PushResult {
  ok: boolean;
  repoUrl: string;
  uploaded: number;
  requestId: string;
  error?: string;
  accessToken?: string;
  refreshToken?: string;
  sshUrl?: string;
  privateKeyUuid?: string;
  publicKey?: string;
}

export interface DeployKeyResult {
  ok: boolean;
  sshUrl?: string;
  privateKeyUuid?: string;
  publicKey?: string;
  error?: string;
  accessToken?: string;
  refreshToken?: string;
}

@Injectable()
export class GitccService {
  private readonly logger = new Logger(GitccService.name);

  constructor(private readonly openhost: OpenhostService) {}

  get configured(): boolean {
    const e = env();
    return !!(e.gitccGitlabClientId && e.gitccGitlabClientSecret);
  }

  authorizeUrl(state: string, next?: string): string {
    const e = env();
    const params = new URLSearchParams({
      client_id: e.gitccGitlabClientId,
      redirect_uri: e.gitccGitlabRedirectUri,
      response_type: 'code',
      state,
      scope: 'api read_user',
    });
    if (next) params.set('next', next);
    return `${e.gitccGitlabBaseUrl}/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<TokenPair | null> {
    if (!this.configured) {
      return {
        access_token: `stub-token-${Date.now()}`,
        refresh_token: `stub-refresh-${Date.now()}`,
      };
    }
    const e = env();
    try {
      const res = await fetch(`${e.gitccGitlabBaseUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: timeoutSignal(15_000),
        body: JSON.stringify({
          client_id: e.gitccGitlabClientId,
          client_secret: e.gitccGitlabClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: e.gitccGitlabRedirectUri,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(`GitCC token exchange failed: ${res.status} ${body}`);
        return null;
      }
      return (await res.json()) as TokenPair;
    } catch (err) {
      this.logger.error(`exchangeCode error: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    if (!this.configured) {
      return {
        access_token: `stub-token-${Date.now()}`,
        refresh_token: refreshToken,
      };
    }
    const e = env();
    try {
      const res = await fetch(`${e.gitccGitlabBaseUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: timeoutSignal(15_000),
        body: JSON.stringify({
          client_id: e.gitccGitlabClientId,
          client_secret: e.gitccGitlabClientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(`GitCC token refresh failed: ${res.status} ${body}`);
        return null;
      }
      return (await res.json()) as TokenPair;
    } catch (err) {
      this.logger.error(`refreshAccessToken error: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  async push(
    accessToken: string,
    repoName: string,
    files: PushFile[],
    refreshToken?: string,
    lovecodeProjectId?: string,
    existingDeployKeyUuid?: string,
  ): Promise<PushResult> {
    const requestId = `req-${Date.now()}`;

    if (!this.configured) {
      return {
        ok: true,
        repoUrl: `https://gitcc.com/user/${repoName}`,
        uploaded: files.length,
        requestId,
      };
    }

    const e = env();
    const api = (path: string) => `${e.gitccGitlabBaseUrl}${path}`;

    const auth = await this.ensureValidToken(accessToken, refreshToken);
    if (!auth) {
      return {
        ok: false,
        repoUrl: '',
        uploaded: 0,
        requestId,
        error: 'GitCC session expired. Please reconnect your GitCC account.',
      };
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.accessToken}`,
    };

    try {
      // 1. Resolve the authenticated user's namespace.
      const userRes = await fetch(api('/api/v4/user'), { headers, signal: timeoutSignal(15_000) });
      if (!userRes.ok) {
        const body = await userRes.text();
        throw new Error(`Could not resolve GitLab user: ${userRes.status} ${body}`);
      }
      const user = (await userRes.json()) as GitlabUser;
      const namespace = user.username;
      const projectPathWithNamespace = `${namespace}/${repoName}`;
      const encodedPath = encodeURIComponent(projectPathWithNamespace);

      // 2. Find or create the project.
      let project: GitlabProject | null = null;
      const findRes = await fetch(api(`/api/v4/projects/${encodedPath}`), { headers, signal: timeoutSignal(15_000) });
      if (findRes.ok) {
        project = this.normalizeGitccProject((await findRes.json()) as GitlabProject);
      } else if (findRes.status === 404) {
        const createRes = await fetch(api('/api/v4/projects'), {
          method: 'POST',
          headers,
          signal: timeoutSignal(30_000),
          body: JSON.stringify({
            name: repoName,
            path: repoName,
            visibility: 'public',
            default_branch: 'main',
            initialize_with_readme: true,
          }),
        });
        if (!createRes.ok) {
          const body = await createRes.text();
          throw new Error(`Could not create GitLab project: ${createRes.status} ${body}`);
        }
        project = this.normalizeGitccProject((await createRes.json()) as GitlabProject);
      } else {
        const body = await findRes.text();
        throw new Error(`Could not look up GitLab project: ${findRes.status} ${body}`);
      }

      // Ensure the project is public so OpenHost can clone over HTTPS without a deploy key.
      if (project.visibility !== 'public') {
        const visibilityRes = await fetch(api(`/api/v4/projects/${project.id}`), {
          method: 'PUT',
          headers,
          signal: timeoutSignal(15_000),
          body: JSON.stringify({ visibility: 'public' }),
        });
        if (visibilityRes.ok) {
          project = { ...project, visibility: 'public' };
        } else {
          this.logger.warn(`Could not change project visibility to public: ${visibilityRes.status}`);
        }
      }

      const projectId = project.id;
      const defaultBranch = project.default_branch || 'main';
      const repoUrl = project.web_url;
      const sshUrl = project.ssh_url_to_repo;

      let privateKeyUuid = existingDeployKeyUuid;
      let publicKey: string | undefined;
      if (!privateKeyUuid) {
        try {
          const created = await this.createDeployKeyForProject(api, headers, projectId, project.name);
          privateKeyUuid = created.uuid;
          publicKey = created.publicKey;
        } catch (keyErr) {
          this.logger.warn(
            `Could not create per-project deploy key for ${projectPathWithNamespace}: ${keyErr instanceof Error ? keyErr.message : String(keyErr)}`,
          );
        }
      }

      if (!files.length) {
        return { ok: true, repoUrl, sshUrl, privateKeyUuid, publicKey, uploaded: 0, requestId, ...auth };
      }

      // 3. Discover existing files so we can update instead of create when needed.
      const existingPaths = await this.fetchExistingPaths(api, headers, projectId, defaultBranch);

      // 4. Build commits with all files, chunked to stay within GitLab limits.
      const actions = files.map((file) => ({
        action: existingPaths.has(file.path) ? ('update' as const) : ('create' as const),
        file_path: file.path,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64' as const,
      }));

      const CHUNK_SIZE = 100;
      let totalUploaded = 0;
      const chunkCount = Math.ceil(actions.length / CHUNK_SIZE);
      for (let i = 0; i < actions.length; i += CHUNK_SIZE) {
        const chunk = actions.slice(i, i + CHUNK_SIZE);
        const commitMessage = chunkCount > 1
          ? `Update from LoveCode (${i / CHUNK_SIZE + 1}/${chunkCount})`
          : 'Update from LoveCode';

        const commitRes = await fetch(api(`/api/v4/projects/${projectId}/repository/commits`), {
          method: 'POST',
          headers,
          signal: timeoutSignal(60_000),
          body: JSON.stringify({
            branch: defaultBranch,
            commit_message: commitMessage,
            actions: chunk,
          }),
        });

        if (!commitRes.ok) {
          const body = await commitRes.text();
          throw new Error(`GitLab commit failed: ${commitRes.status} ${body}`);
        }
        totalUploaded += chunk.length;
      }

      return { ok: true, repoUrl, sshUrl, privateKeyUuid, publicKey, uploaded: totalUploaded, requestId, ...auth };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`GitCC push failed: ${message}`);
      return { ok: false, repoUrl: '', uploaded: 0, requestId, error: message };
    }
  }

  async ensureValidToken(
    accessToken: string,
    refreshToken?: string,
  ): Promise<{ accessToken: string; refreshToken?: string } | null> {
    const e = env();
    const api = (path: string) => `${e.gitccGitlabBaseUrl}${path}`;
    const headers = { Authorization: `Bearer ${accessToken}` };

    const userRes = await fetch(api('/api/v4/user'), { headers, signal: timeoutSignal(15_000) });
    if (userRes.ok) {
      return { accessToken, refreshToken };
    }

    if (userRes.status === 401 && refreshToken) {
      const refreshed = await this.refreshAccessToken(refreshToken);
      if (refreshed) {
        return {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token ?? refreshToken,
        };
      }
    }

    return null;
  }

  async getProject(
    accessToken: string,
    repoUrl: string,
    refreshToken?: string,
  ): Promise<{ ok: false; error: string } | { ok: true; project: GitlabProject; accessToken?: string; refreshToken?: string }> {
    if (!this.configured) {
      const path = this.parseRepoPath(repoUrl);
      if (!path) return { ok: false, error: 'Invalid repository URL' };
      const host = new URL(env().gitccGitlabBaseUrl).hostname;
      return {
        ok: true,
        project: {
          id: 0,
          name: path.split('/').pop() || '',
          path: path.split('/').pop() || '',
          path_with_namespace: path,
          web_url: `https://${host}/${path}`,
          ssh_url_to_repo: `git@${host}:${path}.git`,
          http_url_to_repo: `https://${host}/${path}.git`,
          visibility: 'private',
        },
      };
    }

    const e = env();
    const api = (path: string) => `${e.gitccGitlabBaseUrl}${path}`;
    const auth = await this.ensureValidToken(accessToken, refreshToken);
    if (!auth) {
      return { ok: false, error: 'GitCC session expired. Please reconnect your GitCC account.' };
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.accessToken}`,
    };

    try {
      const projectPath = this.parseRepoPath(repoUrl);
      if (!projectPath) {
        return { ok: false, error: 'Invalid repository URL' };
      }

      const encodedPath = encodeURIComponent(projectPath);
      const findRes = await fetch(api(`/api/v4/projects/${encodedPath}`), {
        headers,
        signal: timeoutSignal(15_000),
      });
      if (!findRes.ok) {
        const body = await findRes.text();
        throw new Error(`Could not look up GitLab project: ${findRes.status} ${body}`);
      }
      const project = this.normalizeGitccProject((await findRes.json()) as GitlabProject);
      return { ok: true, project, accessToken: auth.accessToken, refreshToken: auth.refreshToken };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`GitCC getProject failed: ${message}`);
      return { ok: false, error: message };
    }
  }

  async ensureDeployKey(
    accessToken: string,
    repoUrl: string,
    refreshToken?: string,
    options?: {
      existingPrivateKeyUuid?: string;
      existingPublicKey?: string;
    },
  ): Promise<DeployKeyResult> {
    if (!this.configured) {
      return {
        ok: true,
        sshUrl: this.convertRepoUrlToSsh(repoUrl),
        privateKeyUuid: options?.existingPrivateKeyUuid,
      };
    }

    const e = env();
    const api = (path: string) => `${e.gitccGitlabBaseUrl}${path}`;
    const auth = await this.ensureValidToken(accessToken, refreshToken);
    if (!auth) {
      return {
        ok: false,
        error: 'GitCC session expired. Please reconnect your GitCC account.',
      };
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.accessToken}`,
    };

    try {
      const projectPath = this.parseRepoPath(repoUrl);
      if (!projectPath) {
        return { ok: false, error: 'Invalid repository URL' };
      }

      const encodedPath = encodeURIComponent(projectPath);
      const findRes = await fetch(api(`/api/v4/projects/${encodedPath}`), {
        headers,
        signal: timeoutSignal(15_000),
      });
      if (!findRes.ok) {
        const body = await findRes.text();
        throw new Error(`Could not look up GitLab project: ${findRes.status} ${body}`);
      }
      const project = this.normalizeGitccProject((await findRes.json()) as GitlabProject);

      let privateKeyUuid = options?.existingPrivateKeyUuid;
      const existingPublicKey = options?.existingPublicKey;
      this.logger.log(`Deploy-key check for ${projectPath}: existingUuid=${privateKeyUuid ? 'yes' : 'no'}, existingPublicKey=${existingPublicKey ? 'yes' : 'no'}`);
      const keyMatches = privateKeyUuid && existingPublicKey
        ? await this.hasMatchingDeployKey(api, headers, project.id, existingPublicKey)
        : false;
      this.logger.log(`Deploy-key check for ${projectPath}: keyMatchesInGitLab=${keyMatches}`);
      let publicKey: string | undefined;
      if (!privateKeyUuid || !keyMatches) {
        try {
          const created = await this.createDeployKeyForProject(api, headers, project.id, project.name);
          privateKeyUuid = created.uuid;
          publicKey = created.publicKey;
          this.logger.log(`Deploy-key created for ${projectPath}: uuid=${privateKeyUuid}`);
        } catch (keyErr) {
          const keyMessage = keyErr instanceof Error ? keyErr.message : String(keyErr);
          this.logger.warn(`Per-project deploy-key creation failed for ${projectPath}: ${keyMessage}`);
          throw new Error(`Deploy-key setup failed: ${keyMessage}`);
        }
      } else {
        this.logger.log(`Deploy-key reused for ${projectPath}: uuid=${privateKeyUuid}`);
        publicKey = existingPublicKey;
      }

      return { ok: true, sshUrl: project.ssh_url_to_repo, privateKeyUuid, publicKey, ...auth };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`GitCC deploy-key setup failed: ${message}`);
      return { ok: false, error: message };
    }
  }

  private normalizeGitccProject(project: GitlabProject): GitlabProject {
    const host = new URL(env().gitccGitlabBaseUrl).hostname;
    const normalized = { ...project };

    if (normalized.web_url && !this.isAbsoluteUrl(normalized.web_url)) {
      normalized.web_url = `https://${host}/${normalized.web_url.replace(/^\//, '')}`;
    }
    if (normalized.http_url_to_repo && !this.isAbsoluteUrl(normalized.http_url_to_repo)) {
      normalized.http_url_to_repo = `https://${host}/${normalized.http_url_to_repo.replace(/^\//, '')}`;
    }
    if (normalized.ssh_url_to_repo && !this.isAbsoluteSshUrl(normalized.ssh_url_to_repo)) {
      normalized.ssh_url_to_repo = `git@${host}:${normalized.ssh_url_to_repo.replace(/^\//, '')}`;
    }

    return normalized;
  }

  private isAbsoluteUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  private isAbsoluteSshUrl(url: string): boolean {
    return /^git@/i.test(url);
  }

  private parseRepoPath(repoUrl: string): string | null {
    try {
      if (repoUrl.startsWith('git@')) {
        const match = repoUrl.match(/git@[^:]+:(.+?)(?:\.git)?$/);
        return match?.[1] ?? null;
      }
      const url = new URL(repoUrl);
      const path = url.pathname.replace(/^\//, '').replace(/\.git$/, '');
      return path || null;
    } catch {
      return null;
    }
  }

  private convertRepoUrlToSsh(repoUrl: string): string | undefined {
    const path = this.parseRepoPath(repoUrl);
    if (!path) return undefined;
    const host = new URL(env().gitccGitlabBaseUrl).hostname;
    return `git@${host}:${path}.git`;
  }

  private async createDeployKeyForProject(
    api: (path: string) => string,
    headers: Record<string, string>,
    projectId: number,
    projectName: string,
  ): Promise<{ uuid: string; publicKey: string }> {
    const { publicKey, privateKey } = generateSshKeyPair(`openhost-deploy-${projectName}@lovecode.com`);
    const fingerprint = publicKey.split(' ').slice(0, 2).join(' ').slice(0, 40) + '...';
    this.logger.log(`Creating deploy key for ${projectName}: fingerprint=${fingerprint}`);
    await this.addDeployKeyToProject(api, headers, projectId, publicKey);
    const uuid = await this.openhost.uploadPrivateKey(privateKey, `deploy-${projectName}-${Date.now()}`);
    this.logger.log(`Uploaded private key to OpenHost: uuid=${uuid}`);
    return { uuid, publicKey };
  }

  private async addDeployKeyToProject(
    api: (path: string) => string,
    headers: Record<string, string>,
    projectId: number,
    publicKey: string,
  ): Promise<void> {
    const listRes = await fetch(api(`/api/v4/projects/${projectId}/deploy_keys`), {
      headers,
      signal: timeoutSignal(15_000),
    });
    if (listRes.ok) {
      const keys = (await listRes.json()) as Array<{ key: string; title?: string }>;
      const normalizedTarget = publicKey.split(' ').slice(0, 2).join(' ');
      const alreadyExists = keys.some((k) => {
        const normalized = k.key.split(' ').slice(0, 2).join(' ');
        return normalized === normalizedTarget;
      });
      this.logger.log(`GitLab deploy keys for project ${projectId}: count=${keys.length}, alreadyExists=${alreadyExists}`);
      if (alreadyExists) return;
    } else {
      this.logger.warn(`Could not list GitLab deploy keys for project ${projectId}: ${listRes.status}`);
    }

    const addRes = await fetch(api(`/api/v4/projects/${projectId}/deploy_keys`), {
      method: 'POST',
      headers,
      signal: timeoutSignal(15_000),
      body: JSON.stringify({
        title: 'OpenHost deploy key',
        key: publicKey,
        can_push: false,
      }),
    });

    if (!addRes.ok) {
      const body = await addRes.text();
      throw new Error(`Could not add deploy key: ${addRes.status} ${body}`);
    }
    this.logger.log(`Added deploy key to GitLab project ${projectId}`);
  }

  private async hasMatchingDeployKey(
    api: (path: string) => string,
    headers: Record<string, string>,
    projectId: number,
    publicKey: string,
  ): Promise<boolean> {
    const listRes = await fetch(api(`/api/v4/projects/${projectId}/deploy_keys`), {
      headers,
      signal: timeoutSignal(15_000),
    });
    if (!listRes.ok) return false;
    const keys = (await listRes.json()) as Array<{ key?: string }>;
    const normalizedTarget = publicKey.split(' ').slice(0, 2).join(' ');
    return keys.some((k) => {
      const normalized = k.key?.split(' ').slice(0, 2).join(' ') || '';
      return normalized === normalizedTarget;
    });
  }

  private async fetchExistingPaths(
    api: (path: string) => string,
    headers: Record<string, string>,
    projectId: number,
    branch: string,
  ): Promise<Set<string>> {
    const paths = new Set<string>();
    let page = 1;
    const perPage = 100;

    while (page <= 10) {
      try {
        const res = await fetch(
          api(`/api/v4/projects/${projectId}/repository/tree?ref=${branch}&recursive=true&per_page=${perPage}&page=${page}`),
          { headers, signal: timeoutSignal(30_000) },
        );
        if (!res.ok) break;
        const items = (await res.json()) as GitlabTreeItem[];
        if (!Array.isArray(items) || items.length === 0) break;
        for (const item of items) {
          if (item.type === 'blob') paths.add(item.path);
        }
        if (items.length < perPage) break;
        page++;
      } catch {
        break;
      }
    }

    return paths;
  }
}
