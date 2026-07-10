import { Injectable, Logger } from '@nestjs/common';
import { env } from '@/config/env';

@Injectable()
export class OpenhostService {
  private readonly logger = new Logger(OpenhostService.name);

  get configured(): boolean {
    const e = env();
    return !!(e.openhostApiToken && e.openhostServerUuid && e.openhostProjectUuid);
  }

  /**
   * Compute the PocketBase subdomain for a given frontend domain.
   * Examples:
   *   my-site.dpqq.com          -> pb.my-site.dpqq.com
   *   www.example.com           -> pb.www.example.com
   *   subdomain.example.com     -> pb.subdomain.example.com
   */
  pocketbaseDomain(frontendDomain: string): string {
    const prefix = env().openhostPbSubdomainPrefix || 'pb';
    return `${prefix}.${frontendDomain}`;
  }

  async checkDomain(domain: string): Promise<{ available: boolean; message: string; conflictProjectName: string | null }> {
    if (!this.configured) {
      return { available: true, message: 'Domain is available', conflictProjectName: null };
    }
    try {
      const res = await fetch(`${this.baseUrl()}/applications?server_uuid=${env().openhostServerUuid}`, {
        headers: this.headers(),
      });
      const apps = (await res.json()) as Array<{ domain?: string; name?: string }>;
      const conflict = apps.find((a) => a.domain === domain);
      return {
        available: !conflict,
        message: conflict ? 'Domain already in use' : 'Domain is available',
        conflictProjectName: conflict?.name ?? null,
      };
    } catch (err) {
      this.logger.error(`checkDomain error: ${err instanceof Error ? err.message : String(err)}`);
      return { available: true, message: 'Domain appears available', conflictProjectName: null };
    }
  }

  async deployPublic(params: {
    repoUrl: string;
    projectName: string;
    customDomain?: string;
    projectId?: string;
  }): Promise<Record<string, unknown>> {
    if (!this.configured) {
      return {
        ok: true,
        appUuid: `app-${Date.now()}`,
        deploymentUuid: `dep-${Date.now()}`,
        domainUrl: params.customDomain ? `https://${params.customDomain}` : `https://${params.projectName}.${this.baseDomain()}`,
        projectUrl: params.customDomain ? `https://${params.customDomain}` : `https://${params.projectName}.${this.baseDomain()}`,
        isUpdate: false,
        requestId: `req-${Date.now()}`,
      };
    }

    const e = env();
    const gitRepository = this.normalizeGitRepository(params.repoUrl, false);
    this.logger.log(`OpenHost deployPublic: project=${params.projectName}, git=${gitRepository}`);
    try {
      const createRes = await fetch(`${this.baseUrl()}/applications/public`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          name: params.projectName,
          server_uuid: e.openhostServerUuid,
          project_uuid: e.openhostProjectUuid,
          git_repository: gitRepository,
          git_branch: e.openhostGitBranch,
          build_pack: 'dockercompose',
          ports_exposes: e.openhostPortsExposes,
          docker_compose_domains: [{ name: 'nginx', domain: this.ensureUrl(params.customDomain ? params.customDomain : `${params.projectName}.${this.baseDomain()}`) }],
          environment_name: e.openhostEnvironmentName,
        }),
      });
      if (!createRes.ok) {
        const body = await createRes.text();
        throw new Error(`OpenHost create public application failed: ${createRes.status} ${body}`);
      }

      const createData = (await createRes.json()) as { uuid?: string };
      const appUuid = createData.uuid;
      if (!appUuid) {
        throw new Error('OpenHost create public application did not return a uuid');
      }

      const deploymentUuid = `dep-${Date.now()}`;
      await fetch(`${this.baseUrl()}/deploy`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ uuid: appUuid, force: true }),
      });

      const domainUrl = params.customDomain ? `https://${params.customDomain}` : `https://${params.projectName}.${this.baseDomain()}`;
      return {
        ok: true,
        appUuid,
        deploymentUuid,
        domainUrl,
        projectUrl: domainUrl,
        isUpdate: false,
        requestId: `req-${Date.now()}`,
      };
    } catch (err) {
      this.logger.error(`deployPublic error: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  async deploy(params: {
    repoUrl: string;
    projectName: string;
    customDomain?: string;
    projectId?: string;
    sshUrl?: string;
    privateKeyUuid?: string;
  }): Promise<Record<string, unknown>> {
    if (!this.configured) {
      return {
        ok: true,
        appUuid: `app-${Date.now()}`,
        deploymentUuid: `dep-${Date.now()}`,
        domainUrl: params.customDomain ? `https://${params.customDomain}` : `https://${params.projectName}.${this.baseDomain()}`,
        projectUrl: params.customDomain ? `https://${params.customDomain}` : `https://${params.projectName}.${this.baseDomain()}`,
        isUpdate: false,
        requestId: `req-${Date.now()}`,
      };
    }

    const e = env();
    const isSsh = !!(params.privateKeyUuid || e.openhostPrivateKeyUuid);
    const rawGitRepository = isSsh ? (params.sshUrl || params.repoUrl) : params.repoUrl;
    const gitRepository = this.normalizeGitRepository(rawGitRepository, isSsh);
    const requestBody = {
      name: params.projectName,
      server_uuid: e.openhostServerUuid,
      project_uuid: e.openhostProjectUuid,
      git_repository: gitRepository,
      git_branch: e.openhostGitBranch,
      build_pack: 'dockercompose',
      ports_exposes: e.openhostPortsExposes,
      docker_compose_domains: [{ name: 'nginx', domain: this.ensureUrl(params.customDomain ? params.customDomain : `${params.projectName}.${this.baseDomain()}`) }],
      environment_name: e.openhostEnvironmentName,
      private_key_uuid: params.privateKeyUuid || e.openhostPrivateKeyUuid || undefined,
    };
    this.logger.log(`OpenHost deploy: project=${params.projectName}, git=${gitRepository}, private_key_uuid=${requestBody.private_key_uuid ? '***' : 'none'}`);
    this.logger.debug(`OpenHost deploy request body: ${JSON.stringify({ ...requestBody, private_key_uuid: requestBody.private_key_uuid ? '***' : 'none' })}`);
    try {
      const createRes = await fetch(`${this.baseUrl()}/applications/private-deploy-key`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(requestBody),
      });
      if (!createRes.ok) {
        const body = await createRes.text();
        throw new Error(`OpenHost create application failed: ${createRes.status} ${body}`);
      }

      const createData = (await createRes.json()) as { uuid?: string };
      const appUuid = createData.uuid;
      if (!appUuid) {
        throw new Error('OpenHost create application did not return a uuid');
      }

      const deploymentUuid = `dep-${Date.now()}`;
      await fetch(`${this.baseUrl()}/deploy`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ uuid: appUuid, force: true }),
      });

      const domainUrl = params.customDomain ? `https://${params.customDomain}` : `https://${params.projectName}.${this.baseDomain()}`;
      return {
        ok: true,
        appUuid,
        deploymentUuid,
        domainUrl,
        projectUrl: domainUrl,
        isUpdate: false,
        requestId: `req-${Date.now()}`,
      };
    } catch (err) {
      this.logger.error(`deploy error: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  /**
   * Deploy a public PocketBase-backed project using Docker Compose.
   * The generated repository must contain a docker-compose.yaml with
   * `frontend` (port 3000) and `pocketbase` (port 8090) services.
   */
  async deployPocketBaseProjectPublic(params: {
    repoUrl: string;
    projectName: string;
    frontendDomain: string;
    projectId?: string;
  }): Promise<{
    ok: boolean;
    appUuid: string;
    deploymentUuid: string;
    domainUrl: string;
    pocketbaseUrl: string;
    adminUrl: string;
    isUpdate: boolean;
    requestId: string;
  }> {
    const pbDomain = this.pocketbaseDomain(params.frontendDomain);
    if (!this.configured) {
      return {
        ok: true,
        appUuid: `app-${Date.now()}`,
        deploymentUuid: `dep-${Date.now()}`,
        domainUrl: `https://${params.frontendDomain}`,
        pocketbaseUrl: `https://${pbDomain}`,
        adminUrl: `https://${pbDomain}/_/`,
        isUpdate: false,
        requestId: `req-${Date.now()}`,
      };
    }

    const e = env();
    const gitRepository = this.normalizeGitRepository(params.repoUrl, false);
    this.logger.log(`OpenHost deployPocketBasePublic: project=${params.projectName}, git=${gitRepository}`);

    try {
      const createRes = await fetch(`${this.baseUrl()}/applications/public`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          name: params.projectName,
          server_uuid: e.openhostServerUuid,
          project_uuid: e.openhostProjectUuid,
          git_repository: gitRepository,
          git_branch: e.openhostGitBranch,
          build_pack: 'dockercompose',
          ports_exposes: '3000',
          docker_compose_domains: [
            { name: 'nginx', domain: this.ensureUrl(params.frontendDomain) },
            { name: 'pocketbase', domain: this.ensureUrl(pbDomain) },
          ],
          environment_name: e.openhostEnvironmentName,
        }),
      });
      if (!createRes.ok) {
        const body = await createRes.text();
        throw new Error(`OpenHost create public application failed: ${createRes.status} ${body}`);
      }

      const createData = (await createRes.json()) as { uuid?: string };
      const appUuid = createData.uuid;
      if (!appUuid) {
        throw new Error('OpenHost create public application did not return a uuid');
      }

      const deploymentUuid = `dep-${Date.now()}`;
      await fetch(`${this.baseUrl()}/deploy`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ uuid: appUuid, force: true }),
      });

      return {
        ok: true,
        appUuid,
        deploymentUuid,
        domainUrl: `https://${params.frontendDomain}`,
        pocketbaseUrl: `https://${pbDomain}`,
        adminUrl: `https://${pbDomain}/_/`,
        isUpdate: false,
        requestId: `req-${Date.now()}`,
      };
    } catch (err) {
      this.logger.error(`deployPocketBaseProjectPublic error: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  /**
   * Deploy a PocketBase-backed project using Docker Compose.
   * The generated repository must contain a docker-compose.yaml with
   * `frontend` (port 3000) and `pocketbase` (port 8090) services.
   */
  async deployPocketBaseProject(params: {
    repoUrl: string;
    projectName: string;
    frontendDomain: string;
    projectId?: string;
    sshUrl?: string;
    privateKeyUuid?: string;
  }): Promise<{
    ok: boolean;
    appUuid: string;
    deploymentUuid: string;
    domainUrl: string;
    pocketbaseUrl: string;
    adminUrl: string;
    isUpdate: boolean;
    requestId: string;
  }> {
    const pbDomain = this.pocketbaseDomain(params.frontendDomain);
    if (!this.configured) {
      return {
        ok: true,
        appUuid: `app-${Date.now()}`,
        deploymentUuid: `dep-${Date.now()}`,
        domainUrl: `https://${params.frontendDomain}`,
        pocketbaseUrl: `https://${pbDomain}`,
        adminUrl: `https://${pbDomain}/_/`,
        isUpdate: false,
        requestId: `req-${Date.now()}`,
      };
    }

    const e = env();
    const isSsh = !!(params.privateKeyUuid || e.openhostPrivateKeyUuid);
    const rawGitRepository = isSsh ? (params.sshUrl || params.repoUrl) : params.repoUrl;
    const gitRepository = this.normalizeGitRepository(rawGitRepository, isSsh);
    const requestBody = {
      name: params.projectName,
      server_uuid: e.openhostServerUuid,
      project_uuid: e.openhostProjectUuid,
      git_repository: gitRepository,
      git_branch: e.openhostGitBranch,
      build_pack: 'dockercompose',
      ports_exposes: '3000',
      docker_compose_domains: [
        { name: 'nginx', domain: this.ensureUrl(params.frontendDomain) },
        { name: 'pocketbase', domain: this.ensureUrl(pbDomain) },
      ],
      environment_name: e.openhostEnvironmentName,
      private_key_uuid: params.privateKeyUuid || e.openhostPrivateKeyUuid || undefined,
    };
    this.logger.log(`OpenHost deployPocketBase: project=${params.projectName}, git=${gitRepository}, private_key_uuid=${requestBody.private_key_uuid ? '***' : 'none'}`);
    this.logger.debug(`OpenHost deployPocketBase request body: ${JSON.stringify({ ...requestBody, private_key_uuid: requestBody.private_key_uuid ? '***' : 'none' })}`);

    try {
      const createRes = await fetch(`${this.baseUrl()}/applications/private-deploy-key`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(requestBody),
      });
      if (!createRes.ok) {
        const body = await createRes.text();
        throw new Error(`OpenHost create application failed: ${createRes.status} ${body}`);
      }

      const createData = (await createRes.json()) as { uuid?: string };
      const appUuid = createData.uuid;
      if (!appUuid) {
        throw new Error('OpenHost create application did not return a uuid');
      }

      const deploymentUuid = `dep-${Date.now()}`;
      await fetch(`${this.baseUrl()}/deploy`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ uuid: appUuid, force: true }),
      });

      return {
        ok: true,
        appUuid,
        deploymentUuid,
        domainUrl: `https://${params.frontendDomain}`,
        pocketbaseUrl: `https://${pbDomain}`,
        adminUrl: `https://${pbDomain}/_/`,
        isUpdate: false,
        requestId: `req-${Date.now()}`,
      };
    } catch (err) {
      this.logger.error(`deployPocketBaseProject error: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  async status(deploymentUuid: string, appUuid: string): Promise<Record<string, unknown>> {
    if (!this.configured) {
      return {
        success: true,
        app: { uuid: appUuid, status: 'running' },
        latestDeployment: { uuid: deploymentUuid, status: 'finished' },
      };
    }

    try {
      const [appRes, deployRes] = await Promise.all([
        fetch(`${this.baseUrl()}/applications/${appUuid}`, { headers: this.headers() }),
        fetch(`${this.baseUrl()}/deployments/${deploymentUuid}`, { headers: this.headers() }),
      ]);
      return {
        success: true,
        app: appRes.ok ? await appRes.json() : { uuid: appUuid, status: 'unknown' },
        latestDeployment: deployRes.ok ? await deployRes.json() : { uuid: deploymentUuid, status: 'unknown' },
      };
    } catch (err) {
      this.logger.error(`status error: ${err instanceof Error ? err.message : String(err)}`);
      return { success: false, app: { uuid: appUuid }, latestDeployment: { uuid: deploymentUuid } };
    }
  }

  async updateApplicationPrivateKey(appUuid: string, privateKeyUuid: string): Promise<void> {
    if (!this.configured) return;
    const res = await fetch(`${this.baseUrl()}/applications/${appUuid}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ private_key_uuid: privateKeyUuid }),
    });
    if (!res.ok) {
      const body = await res.text();
      this.logger.warn(`OpenHost update application private_key_uuid failed: ${res.status} ${body}`);
    } else {
      this.logger.log(`OpenHost application ${appUuid} updated with private_key_uuid=${privateKeyUuid}`);
    }
  }

  async updateApplicationGitRepository(appUuid: string, gitRepository: string, options?: { removePrivateKey?: boolean; privateKeyUuid?: string }): Promise<void> {
    if (!this.configured) return;
    const normalized = this.normalizeGitRepository(gitRepository, !!(options?.privateKeyUuid || env().openhostPrivateKeyUuid));
    const body: Record<string, unknown> = { git_repository: normalized };
    if (options?.removePrivateKey) {
      body.private_key_uuid = null;
    }
    const res = await fetch(`${this.baseUrl()}/applications/${appUuid}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const resBody = await res.text();
      this.logger.warn(`OpenHost update application git_repository failed: ${res.status} ${resBody}`);
    } else {
      this.logger.log(`OpenHost application ${appUuid} updated with git_repository=${normalized}, removePrivateKey=${options?.removePrivateKey ?? false}`);
    }
  }

  async deleteApplication(appUuid: string): Promise<void> {
    if (!this.configured) return;
    try {
      const stopRes = await fetch(`${this.baseUrl()}/applications/${appUuid}/stop`, {
        method: 'POST',
        headers: this.headers(),
      });
      if (!stopRes.ok) {
        this.logger.warn(`OpenHost stop application ${appUuid} before delete returned ${stopRes.status}`);
      }
    } catch (err) {
      this.logger.warn(`OpenHost stop application ${appUuid} before delete failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    const res = await fetch(`${this.baseUrl()}/applications/${appUuid}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenHost delete application failed: ${res.status} ${body}`);
    }
    this.logger.log(`OpenHost application ${appUuid} deleted`);
  }

  async redeploy(params: {
    appUuid: string;
    deploymentUuid?: string;
    domainUrl?: string;
  }): Promise<Record<string, unknown>> {
    const appUuid = params.appUuid;
    if (!this.configured) {
      return {
        ok: true,
        appUuid,
        deploymentUuid: params.deploymentUuid || `dep-${Date.now()}`,
        domainUrl: params.domainUrl || '',
        projectUrl: params.domainUrl || '',
        isUpdate: true,
        requestId: `req-${Date.now()}`,
      };
    }

    const deploymentUuid = params.deploymentUuid || `dep-${Date.now()}`;
    this.logger.log(`OpenHost redeploy: appUuid=${appUuid}`);
    const res = await fetch(`${this.baseUrl()}/deploy`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ uuid: appUuid, force: true }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenHost redeploy failed: ${res.status} ${body}`);
    }

    return {
      ok: true,
      appUuid,
      deploymentUuid,
      domainUrl: params.domainUrl || '',
      projectUrl: params.domainUrl || '',
      isUpdate: true,
      requestId: `req-${Date.now()}`,
    };
  }

  async uploadPrivateKey(privateKey: string, name: string): Promise<string> {
    if (!this.configured) {
      throw new Error('OpenHost is not configured');
    }
    const res = await fetch(`${this.baseUrl()}/security/keys`, {
      method: 'POST',
      headers: this.headers(),
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        name,
        private_key: privateKey,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenHost upload private key failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as { uuid?: string };
    if (!data.uuid) {
      throw new Error('OpenHost upload private key did not return a uuid');
    }
    return data.uuid;
  }

  private normalizeGitRepository(url: string, isSsh: boolean): string {
    if (!url) return url;
    if (/^(https?:|git@)/i.test(url)) return url;

    const baseUrl = new URL(env().gitccGitlabBaseUrl);
    const host = baseUrl.hostname;
    const basePath = baseUrl.pathname.replace(/\/+$/, '');
    const path = url.replace(/^\/+/, '');
    const normalizedPath = basePath ? `${basePath}/${path}` : path;

    if (isSsh) {
      return `git@${host}:${normalizedPath}`;
    }

    return new URL(normalizedPath, `${baseUrl.origin}/`).toString();
  }

  private ensureUrl(domain: string): string {
    const trimmed = domain.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  private baseUrl(): string {
    return env().openhostBaseUrl.replace(/\/$/, '');
  }

  baseDomain(): string {
    const e = env();
    if (e.openhostBaseDomain) return e.openhostBaseDomain;
    try {
      return new URL(e.openhostBaseUrl).hostname;
    } catch {
      return 'dpqq.com';
    }
  }

  private headers(): Record<string, string> {
    const token = env().openhostApiToken;
    const masked = token ? `${token.slice(0, 4)}...${token.slice(-4)}` : '<missing>';
    this.logger.debug(`OpenHost request to ${this.baseUrl()} with token ${masked}`);
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }
}
