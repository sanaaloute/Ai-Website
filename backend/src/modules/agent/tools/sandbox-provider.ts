import { Logger } from '@nestjs/common';
import { E2BService, isForbiddenPath } from '@/lib/e2b.service';

const WORKSPACE_ROOT = '/home/user/app';
const DEFAULT_COMMAND_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

export interface StartPocketBaseResult {
  url: string;
  template: { id: string };
  collectionsCreated: string[];
  recordsSeeded: number;
}

/**
 * SandboxProvider exposes the operations the new LangChain tools expect.
 * It wraps E2BService and normalizes paths around /home/user/app.
 */
export class SandboxProvider {
  private readonly logger = new Logger(SandboxProvider.name);
  private sandboxId: string;

  constructor(
    private readonly e2b: E2BService,
    sandboxId: string,
    private readonly projectId?: string,
  ) {
    this.sandboxId = sandboxId;
  }

  get currentSandboxId(): string {
    return this.sandboxId;
  }

  async ensureAlive(_userId?: string): Promise<string> {
    const data = await this.e2b.ensureAlive(this.sandboxId);
    if (!data) {
      throw new Error(`Sandbox ${this.sandboxId} is gone`);
    }
    this.sandboxId = data.sandboxId;
    return this.sandboxId;
  }

  async readFile(inputPath: string): Promise<string> {
    const relativePath = this.toRelativePath(inputPath);
    const content = await this.e2b.readFile(this.sandboxId, relativePath);
    if (content === null) {
      throw new Error(`Could not read ${relativePath}`);
    }
    return content;
  }

  async writeFile(inputPath: string, content: string): Promise<void> {
    const relativePath = this.toRelativePath(inputPath);
    if (isForbiddenPath(relativePath)) {
      throw new Error(
        `Cannot write ${relativePath}: generated or managed paths (dist/, node_modules/, .next/, .agent_state/, lock files, etc.) cannot be edited directly`,
      );
    }
    const ok = await this.e2b.writeFile(this.sandboxId, relativePath, content);
    if (!ok) {
      throw new Error(`Could not write ${relativePath}`);
    }
  }

  /**
   * Write a file bypassing agent-level forbidden-path checks.
   * Use only for trusted internal state such as manifests.
   */
  async writeSystemFile(inputPath: string, content: string): Promise<void> {
    const relativePath = this.toRelativePath(inputPath);
    const ok = await this.e2b.writeSystemFile(this.sandboxId, relativePath, content);
    if (!ok) {
      throw new Error(`Could not write ${relativePath}`);
    }
  }

  async runCommand(
    command: string,
    cwd = WORKSPACE_ROOT,
    opts?: {
      timeoutMs?: number;
      onStdout?: (data: string) => void | Promise<void>;
      onStderr?: (data: string) => void | Promise<void>;
    },
  ): Promise<CommandResult> {
    const res = await this.e2b.runCommand(this.sandboxId, command, cwd, {
      timeoutMs: opts?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS,
      onStdout: opts?.onStdout,
      onStderr: opts?.onStderr,
    });
    return {
      stdout: res.output,
      stderr: res.error,
      exitCode: res.exitCode,
      success: res.exitCode === 0,
    };
  }

  async listFiles(directory = WORKSPACE_ROOT): Promise<string[]> {
    const dir = this.toAbsolutePath(directory);
    const res = await this.e2b.runCommand(
      this.sandboxId,
      `find ${dir} -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' -not -path '*/dist/*' -not -path '*/.agent_state/*' | sort`,
      WORKSPACE_ROOT,
    );
    const paths = (res.output || '')
      .split('\n')
      .filter(Boolean)
      .map((p) => p.replace(`${WORKSPACE_ROOT}/`, ''));
    return paths;
  }

  async getSandboxUrl(): Promise<string> {
    return this.e2b.getPreviewUrl(this.sandboxId);
  }

  async startPocketBase(options?: { templateId?: string }): Promise<StartPocketBaseResult> {
    const info = await this.e2b.getPocketbaseInfo(this.sandboxId);
    const templateId = options?.templateId || 'generic';
    if (!info) {
      throw new Error('PocketBase is not configured for this sandbox');
    }

    const collectionsCreated: string[] = [];
    let recordsSeeded = 0;

    try {
      // Authenticate as admin
      const authRes = await fetch(`${info.url}/api/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: info.adminEmail, password: info.adminPassword }),
      });

      if (!authRes.ok) {
        throw new Error(`PocketBase admin auth failed: ${authRes.status}`);
      }

      const authData = (await authRes.json()) as { token?: string };
      const token = authData.token;
      if (!token) {
        throw new Error('PocketBase admin auth returned no token');
      }

      // List collections
      const collectionsRes = await fetch(`${info.url}/api/collections`, {
        headers: { Authorization: token },
      });

      if (collectionsRes.ok) {
        const collectionsData = (await collectionsRes.json()) as { items?: Array<{ name: string }> };
        const items = collectionsData.items ?? [];
        for (const item of items) {
          if (item.name) {
            collectionsCreated.push(item.name);
            // Count records in each collection
            try {
              const recordsRes = await fetch(`${info.url}/api/collections/${item.name}/records?perPage=1`, {
                headers: { Authorization: token },
              });
              if (recordsRes.ok) {
                const recordsData = (await recordsRes.json()) as { totalItems?: number };
                recordsSeeded += recordsData.totalItems ?? 0;
              }
            } catch {
              // ignore per-collection errors
            }
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not inspect PocketBase collections: ${message}`);
      // Return the basic info anyway; the backend is still running.
    }

    return {
      url: info.url,
      template: { id: templateId },
      collectionsCreated,
      recordsSeeded,
    };
  }

  async restartPreview(): Promise<boolean> {
    return this.e2b.restartPreview(this.sandboxId);
  }

  /**
   * Checks whether the Vite dev server is responding inside the sandbox.
   * This is used by finalizeNode to avoid restarting an already-healthy preview
   * during fast edits, while still guaranteeing a running preview before returning.
   */
  async isPreviewHealthy(): Promise<boolean> {
    try {
      const result = await this.runCommand(
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/",
        WORKSPACE_ROOT,
        { timeoutMs: 5_000 },
      );
      return result.success && result.stdout.trim() === '200';
    } catch {
      return false;
    }
  }

  async installPackage(packageName: string): Promise<CommandResult> {
    return this.runCommand(`npm install ${packageName}`);
  }

  private toRelativePath(inputPath: string): string {
    if (inputPath.startsWith(WORKSPACE_ROOT)) {
      return inputPath.slice(WORKSPACE_ROOT.length + 1);
    }
    if (inputPath.startsWith('/')) {
      return inputPath.slice(1);
    }
    return inputPath;
  }

  private toAbsolutePath(inputPath: string): string {
    if (inputPath.startsWith(WORKSPACE_ROOT)) {
      return inputPath;
    }
    if (inputPath.startsWith('/')) {
      return `${WORKSPACE_ROOT}${inputPath}`;
    }
    return `${WORKSPACE_ROOT}/${inputPath}`;
  }
}
