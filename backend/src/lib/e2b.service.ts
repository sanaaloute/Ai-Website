import { Injectable, Logger } from '@nestjs/common';
import { Sandbox } from 'e2b';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomBytes } from 'node:crypto';
import { env } from '@/config/env';
import { SandboxData } from '@/types';
import { generateSandboxPocketbaseCredentials } from './pocketbase.service';
import { MINIMAL_GENERIC_TEMPLATE } from '@/modules/agent/services/template.service';
import { SandboxStateService, type PocketbaseInfo } from './sandbox-state.service';

export const WORKDIR = '/home/user/app';
const PORT = 5173;
const NEXT_PORT = 3000;
const VITE_LOG = '/tmp/vite.log';
const NEXT_LOG = '/tmp/next.log';
const POCKETBASE_PORT = 8090;
const POCKETBASE_DIR = '/home/user/pb';
// The bundled JS migrations/hooks use the legacy Dao / onModelBeforeCreate API,
// which was removed in PocketBase v0.23. Pin to the latest v0.22.x backport.
const POCKETBASE_VERSION = '0.22.46';
const CONNECT_TIMEOUT_MS = 10_000;
const CREATE_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 30_000;
const SANDBOX_LIFETIME_MS = 60 * 60 * 1000;

function isTimeoutOrNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    msg.includes('eai_again') ||
    msg.includes('fetch failed') ||
    msg.includes('network')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Directory prefixes that must never be written by agents or API callers.
 * These are generated/managed by package managers and build tools.
 */
export const FORBIDDEN_PATH_PREFIXES = [
  'node_modules/',
  '.git/',
  '.next/',
  'dist/',
  '.agent_state/',
];

/**
 * Exact file names that are managed by package managers and must not be edited
 * directly by agents.
 */
export const FORBIDDEN_FILE_NAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
]);

export type SandboxFramework = 'next' | 'vite';

function portFor(framework: SandboxFramework): number {
  return framework === 'next' ? NEXT_PORT : PORT;
}
function logFor(framework: SandboxFramework): string {
  return framework === 'next' ? NEXT_LOG : VITE_LOG;
}

export function isForbiddenPath(relativePath: string): boolean {
  const normalized = path.posix.normalize(relativePath).replace(/^\.\//, '').replace(/^\//, '');
  if (FORBIDDEN_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }
  // Also reject exact forbidden directory names and absolute variants.
  const lower = normalized.toLowerCase();
  if (lower === 'node_modules' || lower === '.git' || lower === '.next' || lower === 'dist') {
    return true;
  }
  // Reject lock files managed by package managers.
  const basename = path.posix.basename(normalized);
  return FORBIDDEN_FILE_NAMES.has(basename);
}

export class E2BNotConfiguredError extends Error {
  constructor() {
    super('E2B_NOT_CONFIGURED');
  }
}

export class SandboxNotFoundError extends Error {
  constructor() {
    super('SANDBOX_NOT_FOUND');
  }
}

export class SandboxGoneError extends Error {
  constructor() {
    super('SANDBOX_GONE');
  }
}

export class E2BProviderError extends Error {
  constructor(message: string) {
    super(message);
  }
}

@Injectable()
export class E2BService {
  private readonly logger = new Logger(E2BService.name);
  /**
   * Local cache of live E2B Sandbox objects. These are not serializable, so
   * they cannot live in Redis. Metadata (lifetimes, chains, PocketBase) is
   * stored in SandboxStateService so the backend remains stateless.
   */
  private readonly sandboxes = new Map<string, Sandbox>();
  /** In-memory cache of per-sandbox framework (next | vite). */
  private readonly frameworks = new Map<string, SandboxFramework>();

  constructor(private readonly state: SandboxStateService) {}

  get configured(): boolean {
    return !!env().e2bApiKey;
  }

  async createSandbox(opts?: { skipSetup?: boolean }): Promise<SandboxData> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    let sandbox: Sandbox;
    try {
      sandbox = await Sandbox.create({
        apiKey: env().e2bApiKey,
        timeoutMs: SANDBOX_LIFETIME_MS,
        requestTimeoutMs: CREATE_TIMEOUT_MS,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`E2B createSandbox failed: ${message}`);
      throw new E2BProviderError(message);
    }

    this.sandboxes.set(sandbox.sandboxId, sandbox);
    this.frameworks.set(sandbox.sandboxId, 'vite');

    const createdAt = new Date().toISOString();
    const endAt = new Date(Date.now() + SANDBOX_LIFETIME_MS).toISOString();

    let initRes: { ok: boolean; output: string; error: string; exitCode: number } | undefined;
    if (!opts?.skipSetup) {
      initRes = await this.initializeProject(sandbox);

      // Point the storefront at the in-sandbox PocketBase via the Vite proxy.
      try {
        await sandbox.files.write(`${WORKDIR}/.env`, 'VITE_POCKETBASE_URL=/\n');
      } catch (envErr) {
        const message = envErr instanceof Error ? envErr.message : String(envErr);
        this.logger.warn(`Could not write storefront .env for sandbox ${sandbox.sandboxId}: ${message}`);
      }
    }

    if (initRes && !initRes.ok) {
      const message = `Sandbox project initialization failed. exitCode=${initRes.exitCode} stdout=${initRes.output} stderr=${initRes.error}`;
      this.logger.error(message);
      try { await sandbox.kill(); } catch { /* ignore */ }
      this.sandboxes.delete(sandbox.sandboxId);
      throw new E2BProviderError(message);
    }

    // Set up PocketBase in the sandbox for e-commerce previews
    let pbInfo: { url: string; adminEmail: string; adminPassword: string } | undefined;
    try {
      pbInfo = await this.setupPocketbase(sandbox);
      const started = await this.startPocketbase(sandbox.sandboxId, pbInfo);
      if (!started) {
        this.logger.warn(`PocketBase did not become reachable for sandbox ${sandbox.sandboxId}`);
      } else if (pbInfo) {
        await this.ensurePocketbaseAdminUser(pbInfo);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`PocketBase setup failed for sandbox ${sandbox.sandboxId}: ${message}`);
      // Non-fatal: the frontend preview still works without PocketBase
    }

    await this.state.setSandboxInfo(sandbox.sandboxId, { createdAt, endAt });

    return {
      sandboxId: sandbox.sandboxId,
      url: this.previewUrl(sandbox),
      provider: 'e2b',
      createdAt,
      endAt,
      files: {},
      structure: '',
      fileCount: 0,
    };
  }

  /**
   * Follow the chain of renewed sandbox IDs to the currently active one.
   */
  private async getCurrentSandboxId(sandboxId: string): Promise<string> {
    return this.state.getCurrentSandboxId(sandboxId);
  }

  /**
   * Ask E2B for the real lifecycle timestamps of a sandbox.
   * This is important because Sandbox.connect() does not reset the TTL,
   * but our previous code reported createdAt/endAt as "now + 1h", which
   * made the frontend think the sandbox had a full hour left and skip
   * proactive renewal.
   */
  private async getSandboxLifetime(sandboxId: string): Promise<{ createdAt: string; endAt: string } | null> {
    if (!this.configured) return null;
    const currentId = await this.getCurrentSandboxId(sandboxId);
    const cached = await this.state.getSandboxInfo(currentId);
    if (cached) {
      return { createdAt: cached.createdAt, endAt: cached.endAt };
    }
    try {
      const info = await Sandbox.getInfo(currentId, {
        apiKey: env().e2bApiKey,
        requestTimeoutMs: REQUEST_TIMEOUT_MS,
      });
      return {
        createdAt: info.startedAt.toISOString(),
        endAt: info.endAt.toISOString(),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not fetch lifecycle info for sandbox ${currentId}: ${msg}`);
      return null;
    }
  }

  async attach(sandboxId: string): Promise<SandboxData> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    const currentId = await this.getCurrentSandboxId(sandboxId);

    try {
      const sandbox = await Sandbox.connect(currentId, {
        apiKey: env().e2bApiKey,
        requestTimeoutMs: CONNECT_TIMEOUT_MS,
      });
      this.sandboxes.set(currentId, sandbox);

      const lifetime = await this.getSandboxLifetime(currentId);
      const now = Date.now();
      const createdAt = lifetime?.createdAt ?? new Date(now).toISOString();
      const endAt = lifetime?.endAt ?? new Date(now + SANDBOX_LIFETIME_MS).toISOString();

      await this.state.setSandboxInfo(currentId, { createdAt, endAt });

      return {
        sandboxId: currentId,
        url: this.previewUrl(sandbox),
        provider: 'e2b',
        createdAt,
        endAt,
        files: {},
        structure: '',
        fileCount: 0,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (isTimeoutOrNetworkError(err)) {
        throw new SandboxGoneError();
      }
      if (lower.includes('not found') || lower.includes('does not exist')) {
        throw new SandboxNotFoundError();
      }
      if (lower.includes('gone')) {
        throw new SandboxGoneError();
      }
      throw new E2BProviderError(msg);
    }
  }

  async kill(sandboxId: string): Promise<boolean> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    const currentId = await this.getCurrentSandboxId(sandboxId);

    try {
      const sandbox =
        this.sandboxes.get(currentId) ??
        (await Sandbox.connect(currentId, {
          apiKey: env().e2bApiKey,
          requestTimeoutMs: CONNECT_TIMEOUT_MS,
        }));
      await sandbox.kill();
      this.sandboxes.delete(currentId);
      await this.state.clearSandboxState(currentId);
      return true;
    } catch {
      this.sandboxes.delete(currentId);
      await this.state.clearSandboxState(currentId);
      return false;
    }
  }

  async getSandboxInfos(): Promise<Array<{ sandboxId: string; createdAt: string; endAt: string; renewing?: boolean }>> {
    const entries = await this.state.listSandboxInfos();
    return entries.map(({ sandboxId, info }) => ({
      sandboxId,
      ...info,
    }));
  }

  async setRenewing(sandboxId: string, renewing: boolean): Promise<void> {
    const currentId = await this.getCurrentSandboxId(sandboxId);
    const info = await this.state.getSandboxInfo(currentId);
    if (info) {
      await this.state.setSandboxInfo(currentId, { ...info, renewing });
    }
  }

  /**
   * Remove local and Redis tracking for a sandbox that is known to be gone.
   * This stops the background lifecycle scheduler from retrying renewal
   * on stale entries without affecting any active renewed sandbox.
   */
  async removeSandboxInfo(sandboxId: string): Promise<void> {
    const currentId = await this.getCurrentSandboxId(sandboxId);
    this.sandboxes.delete(currentId);
    await this.state.clearSandboxState(currentId);
  }

  /**
   * Creates a compressed snapshot of the workspace (excluding large/generated
   * directories) and a manifest of tracked files. The snapshot can be restored
   * with restoreSandboxSnapshot, giving users an atomic rollback path when a
   * generation fails or goes off the rails.
   */
  async snapshotSandbox(sandboxId: string, snapshotId: string): Promise<void> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    const currentId = await this.getCurrentSandboxId(sandboxId);
    const sandbox = await this.getSandbox(currentId);
    if (!sandbox) {
      throw new SandboxNotFoundError();
    }

    const snapshotDir = `${WORKDIR}/.agent_state/snapshots`;
    const excludes = ["node_modules", ".git", "dist", ".next", ".agent_state"]
      .map((dir) => `--exclude='${dir}'`)
      .join(" ");

    const snapshotCmd =
      `mkdir -p ${snapshotDir} && ` +
      `tar -czf ${snapshotDir}/${snapshotId}.tar.gz ${excludes} -C ${WORKDIR} . && ` +
      `cd ${WORKDIR} && find . -type f -not -path './node_modules/*' -not -path './.git/*' -not -path './dist/*' -not -path './.next/*' -not -path './.agent_state/*' | sed 's|^\\./||' | sort > ${snapshotDir}/${snapshotId}.manifest`;

    const result = await sandbox.commands.run(snapshotCmd, { timeoutMs: 60_000 });
    if (result.exitCode !== 0) {
      throw new Error(`Snapshot failed: ${result.stderr || result.stdout}`);
    }

    this.logger.log(`Created snapshot ${snapshotId} for sandbox ${currentId}`);
  }

  /**
   * Restores a sandbox workspace from a previously created snapshot. Files that
   * were added after the snapshot are removed, modified files are overwritten,
   * and node_modules is left untouched so the restore is fast.
   */
  async restoreSandboxSnapshot(sandboxId: string, snapshotId: string): Promise<boolean> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    const currentId = await this.getCurrentSandboxId(sandboxId);
    const sandbox = await this.getSandbox(currentId);
    if (!sandbox) {
      throw new SandboxNotFoundError();
    }

    const snapshotDir = `${WORKDIR}/.agent_state/snapshots`;
    const manifestPath = `${snapshotDir}/${snapshotId}.manifest`;
    const tarPath = `${snapshotDir}/${snapshotId}.tar.gz`;

    // Verify the snapshot exists before attempting destructive operations.
    const check = await sandbox.commands.run(`test -f ${tarPath} && test -f ${manifestPath}`, {
      timeoutMs: 5_000,
    });
    if (check.exitCode !== 0) {
      this.logger.warn(`Snapshot ${snapshotId} not found for sandbox ${currentId}`);
      return false;
    }

    const restoreCmd =
      `cd ${WORKDIR} && ` +
      `find . -type f -not -path './node_modules/*' -not -path './.git/*' -not -path './dist/*' -not -path './.next/*' -not -path './.agent_state/*' | sed 's|^\\./||' | sort > /tmp/snapshot_current && ` +
      `comm -23 /tmp/snapshot_current ${manifestPath} | while IFS= read -r f; do rm -f "$f"; done && ` +
      `tar -xzf ${tarPath}`;

    const result = await sandbox.commands.run(restoreCmd, { timeoutMs: 60_000 });
    if (result.exitCode !== 0) {
      this.logger.error(`Restore failed for snapshot ${snapshotId}: ${result.stderr || result.stdout}`);
      return false;
    }

    this.logger.log(`Restored snapshot ${snapshotId} for sandbox ${currentId}`);
    return true;
  }

  private async registerRenewal(oldId: string, newId: string): Promise<void> {
    const oldCurrent = await this.getCurrentSandboxId(oldId);
    const newCurrent = await this.getCurrentSandboxId(newId);

    if (oldCurrent === newCurrent) return;

    await this.state.setChain(oldCurrent, newCurrent);

    // Old sandbox metadata is no longer the active source of truth, but we
    // must keep the chain pointer so requests keyed to the old ID resolve to
    // the new sandbox. Only delete the info/pocketbase keys.
    await this.state.deleteSandboxInfo(oldCurrent);
    await this.state.deletePocketbaseInfo(oldCurrent);
    this.sandboxes.delete(oldCurrent);
  }

  async renewSandbox(oldSandboxId: string): Promise<SandboxData & { filesMigrated: number }> {
    const currentId = await this.getCurrentSandboxId(oldSandboxId);

    // Already renewed by another request or the background scheduler.
    if (currentId !== oldSandboxId) {
      const data = await this.attach(currentId);
      return { ...data, filesMigrated: 0 };
    }

    const acquired = await this.state.acquireRenewalLock(currentId);
    if (!acquired) {
      // Another worker is renewing; poll briefly for the new sandbox.
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const latestId = await this.getCurrentSandboxId(currentId);
        if (latestId !== currentId) {
          const data = await this.attach(latestId);
          return { ...data, filesMigrated: 0 };
        }
      }
      throw new Error('Sandbox renewal is already in progress and did not complete in time');
    }

    try {
      const result = await this.doRenewSandbox(currentId);
      return result;
    } finally {
      await this.state.releaseRenewalLock(currentId);
    }
  }

  private async doRenewSandbox(currentId: string): Promise<SandboxData & { filesMigrated: number }> {
    const start = Date.now();

    // 1. Snapshot the current sandbox.
    const files = await this.readFiles(currentId, { maxFiles: 1000 });

    // 2. Create a fresh 1-hour sandbox.
    const newSandbox = await this.createSandbox();

    try {
      // 3. Migrate every file.
      for (const [path, content] of Object.entries(files.files)) {
        await this.writeFile(newSandbox.sandboxId, path, content);
      }

      // 4. Ensure a runnable project exists, then reinstall dependencies.
      // If the snapshot was empty or missing package.json, seed the generic
      // template so the dev server can actually start.
      if (!files.files['package.json']) {
        this.logger.warn(
          `Renewed sandbox ${newSandbox.sandboxId} is missing package.json; seeding generic template`,
        );
        for (const [templatePath, templateContent] of Object.entries(MINIMAL_GENERIC_TEMPLATE)) {
          await this.writeFile(newSandbox.sandboxId, templatePath, templateContent);
        }
      }

      const installRes = await this.runCommand(newSandbox.sandboxId, 'npm install', WORKDIR, {
        timeoutMs: 5 * 60 * 1000,
      });
      if (installRes.exitCode !== 0) {
        this.logger.error(
          `npm install failed in renewed sandbox ${newSandbox.sandboxId}: exitCode=${installRes.exitCode}, stdout=${installRes.output}, stderr=${installRes.error}`,
        );
        throw new Error(`npm install failed: ${installRes.error || installRes.output}`);
      }

      // 5. Start the Vite dev server so the preview URL works immediately.
      const restarted = await this.restartPreview(newSandbox.sandboxId);
      if (!restarted) {
        throw new Error('Failed to start dev server in renewed sandbox');
      }

      // 6. Only kill the old sandbox after the new one is fully bootstrapped.
      try {
        await this.kill(currentId);
      } catch (killErr) {
        const msg = killErr instanceof Error ? killErr.message : String(killErr);
        this.logger.warn(`Failed to kill old sandbox ${currentId} after renewal: ${msg}`);
      }

      // 7. Point any references to the old ID at the new sandbox.
      await this.registerRenewal(currentId, newSandbox.sandboxId);

      const filesMigrated = Object.keys(files.files).length;
      this.logger.log(
        `Renewed sandbox ${currentId} -> ${newSandbox.sandboxId} (${filesMigrated} files, ${Date.now() - start}ms)`,
      );

      return {
        ...newSandbox,
        filesMigrated,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Sandbox renewal failed for ${currentId}: ${message}`);
      try {
        await this.kill(newSandbox.sandboxId);
      } catch {
        // ignore
      }
      throw err;
    }
  }

  async runCommand(
    sandboxId: string,
    command: string,
    cwd = WORKDIR,
    opts?: {
      timeoutMs?: number;
      onStdout?: (data: string) => void | Promise<void>;
      onStderr?: (data: string) => void | Promise<void>;
    },
  ): Promise<{ output: string; error: string; exitCode: number }> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new SandboxNotFoundError();
    }

    try {
      const result = await sandbox.commands.run(command, {
        cwd,
        timeoutMs: opts?.timeoutMs,
        onStdout: opts?.onStdout,
        onStderr: opts?.onStderr,
      });
      return { output: result.stdout, error: result.stderr, exitCode: result.exitCode };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('gone')) {
        const currentId = await this.getCurrentSandboxId(sandboxId);
        this.sandboxes.delete(currentId);
        throw new SandboxGoneError();
      }
      throw new Error(msg);
    }
  }

  async readFile(sandboxId: string, relativePath: string): Promise<string | null> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new SandboxNotFoundError();
    }

    try {
      return await sandbox.files.read(`${WORKDIR}/${relativePath}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('not found') || msg.includes('does not exist')) {
        return null;
      }
      throw new Error(msg);
    }
  }

  async ensureAlive(sandboxId: string): Promise<SandboxData> {
    return this.attach(sandboxId);
  }

  async readFiles(
    sandboxId: string,
    opts?: { maxFiles?: number | null; excludePrefixes?: string[] },
  ): Promise<{
    files: Record<string, string>;
    structure: string;
    fileCount: number;
    manifest: Record<string, unknown>;
  }> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new SandboxNotFoundError();
    }

    try {
      const excludePrefixes = opts?.excludePrefixes ?? FORBIDDEN_PATH_PREFIXES;
      const findExcludes = excludePrefixes
        .map((prefix) => {
          const dir = prefix.replace(/\/$/, '');
          return `-not -path '*/${dir}/*'`;
        })
        .join(' ');
      const tree = await sandbox.commands.run(
        `find ${WORKDIR} -type f ${findExcludes} | sort`,
      );
      const paths = tree.stdout.split('\n').filter(Boolean).map((p) => p.replace(`${WORKDIR}/`, ''));
      const files: Record<string, string> = {};
      const maxFiles = opts?.maxFiles === null ? undefined : (opts?.maxFiles ?? 200);
      const pathsToRead = maxFiles ? paths.slice(0, maxFiles) : paths;
      for (const p of pathsToRead) {
        try {
          const content = await sandbox.files.read(`${WORKDIR}/${p}`);
          files[p] = content;
        } catch {
          // skip binary/unreadable
        }
      }
      return {
        files,
        structure: paths.map((p) => `./${p}`).join('\n'),
        fileCount: paths.length,
        manifest: {
          files: {},
          routes: [],
          componentTree: {},
          entryPoint: 'src/main.tsx',
          styleFiles: paths.filter((p) => p.endsWith('.css')),
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('gone')) {
        const currentId = await this.getCurrentSandboxId(sandboxId);
        this.sandboxes.delete(currentId);
        throw new SandboxGoneError();
      }
      throw new Error(msg);
    }
  }

  async writeFile(sandboxId: string, relativePath: string, content: string): Promise<boolean> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    if (isForbiddenPath(relativePath)) {
      this.logger.debug(`writeFile rejected forbidden path: ${relativePath}`);
      return false;
    }

    return this.writeFileInternal(sandboxId, relativePath, content);
  }

  /**
   * Write a file bypassing the agent-forbidden path checks.
   * Use only for trusted internal system state (e.g. manifests, snapshots).
   */
  async writeSystemFile(sandboxId: string, relativePath: string, content: string): Promise<boolean> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    return this.writeFileInternal(sandboxId, relativePath, content);
  }

  async deleteFile(sandboxId: string, relativePath: string): Promise<boolean> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    if (isForbiddenPath(relativePath)) {
      this.logger.debug(`deleteFile rejected forbidden path: ${relativePath}`);
      return false;
    }

    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new SandboxNotFoundError();
    }

    try {
      const fullPath = `${WORKDIR}/${relativePath}`;
      await sandbox.files.remove(fullPath);
      this.logger.debug(`deleteFile ok: ${fullPath}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('gone')) {
        const currentId = await this.getCurrentSandboxId(sandboxId);
        this.sandboxes.delete(currentId);
        throw new SandboxGoneError();
      }
      throw new Error(msg);
    }
  }

  async renameFile(sandboxId: string, relativePath: string, newRelativePath: string): Promise<boolean> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    if (isForbiddenPath(relativePath) || isForbiddenPath(newRelativePath)) {
      this.logger.debug(`renameFile rejected forbidden path: ${relativePath} -> ${newRelativePath}`);
      return false;
    }

    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new SandboxNotFoundError();
    }

    try {
      const fullPath = `${WORKDIR}/${relativePath}`;
      const newFullPath = `${WORKDIR}/${newRelativePath}`;
      await sandbox.files.rename(fullPath, newFullPath);
      this.logger.debug(`renameFile ok: ${fullPath} -> ${newFullPath}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('gone')) {
        const currentId = await this.getCurrentSandboxId(sandboxId);
        this.sandboxes.delete(currentId);
        throw new SandboxGoneError();
      }
      throw new Error(msg);
    }
  }

  private async writeFileInternal(
    sandboxId: string,
    relativePath: string,
    content: string,
  ): Promise<boolean> {
    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new SandboxNotFoundError();
    }

    try {
      const fullPath = `${WORKDIR}/${relativePath}`;
      const dir = path.dirname(fullPath);
      // Ensure parent directories exist; E2B files.write does not always create them.
      if (dir && dir !== WORKDIR && dir !== `${WORKDIR}/` && dir !== '/') {
        const mkdirRes = await this.runCommand(sandboxId, `mkdir -p ${dir}`, WORKDIR);
        if (mkdirRes.exitCode !== 0) {
          this.logger.error(
            `writeFile mkdir failed for ${fullPath}: exitCode=${mkdirRes.exitCode}, stderr=${mkdirRes.error}, stdout=${mkdirRes.output}`,
          );
        } else {
          this.logger.debug(`writeFile mkdir ok for ${fullPath}`);
        }
      }
      await sandbox.files.write(fullPath, content);
      this.logger.debug(`writeFile ok: ${fullPath}`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('gone')) {
        const currentId = await this.getCurrentSandboxId(sandboxId);
        this.sandboxes.delete(currentId);
        throw new SandboxGoneError();
      }
      throw new Error(msg);
    }
  }

  async restartPreview(sandboxId: string): Promise<boolean> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    const framework = await this.detectFramework(sandboxId);
    const log = logFor(framework);
    const killPattern = framework === 'next' ? 'pkill -f "[n]ext" || true' : 'pkill -f "[v]ite" || true';

    // Stop any existing dev server first. Use a pattern that won't match this
    // command itself. Run it as its own command so backgrounding the new server
    // doesn't get killed with the foreground shell.
    await this.runCommand(sandboxId, killPattern, WORKDIR);

    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new SandboxNotFoundError();
    }

    // Templates ship package.json but not node_modules. Install on first run;
    // for Next.js also generate the Prisma client.
    await this.runCommand(sandboxId, 'test -d node_modules || npm install', WORKDIR, { timeoutMs: 300_000 });
    if (framework === 'next') {
      await this.runCommand(sandboxId, 'test -d node_modules/@prisma/client || npx prisma generate', WORKDIR, { timeoutMs: 180_000 });
    }

    // Use setsid + redirected stdin so the dev server survives after the
    // E2B command shell exits.
    const res = await this.runCommand(
      sandboxId,
      `setsid nohup npm run dev > ${log} 2>&1 < /dev/null &`,
      WORKDIR,
    );
    if (res.exitCode !== 0) {
      return false;
    }

    // Wait for the dev server to be reachable before reporting success.
    const url = this.previewUrl(sandbox, framework);
    const deadline = Date.now() + (framework === 'next' ? 90_000 : 60_000);
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const health = await this.previewHealth(url);
      if (health.reachable) {
        return true;
      }
    }

    // Health check timed out — collect dev-server logs for diagnosis.
    const logResult = await this.runCommand(sandboxId, `tail -n 60 ${log} 2>/dev/null || echo "(no dev log)"`, WORKDIR);
    const lastHealth = await this.previewHealth(url);
    this.logger.warn(
      `${framework === 'next' ? 'Next.js' : 'Vite'} dev server for sandbox ${sandboxId} did not become reachable within ${framework === 'next' ? 90 : 60}s. ` +
      `Status code: ${lastHealth.statusCode ?? 'none'}. ` +
      `Recent log:\n${logResult.output || logResult.error || '(empty)'}`,
    );
    return false;
  }

  async previewHealth(previewUrl: string): Promise<{ reachable: boolean; statusCode?: number }> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    try {
      const res = await fetch(previewUrl, { method: 'GET' });
      return { reachable: res.ok, statusCode: res.status };
    } catch {
      return { reachable: false };
    }
  }

  async listRunning(): Promise<Array<Record<string, unknown>>> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    try {
      const paginator = Sandbox.list({ apiKey: env().e2bApiKey, requestTimeoutMs: REQUEST_TIMEOUT_MS });
      const items: Record<string, unknown>[] = [];
      while (paginator.hasNext) {
        const page = await paginator.nextItems();
        for (const s of page) {
          items.push({
            sandboxId: s.sandboxId,
            templateId: s.templateId,
            state: s.state,
            startedAt: s.startedAt?.toISOString() ?? new Date().toISOString(),
            endAt: s.endAt?.toISOString() ?? new Date(Date.now() + SANDBOX_LIFETIME_MS).toISOString(),
            metadata: s.metadata ?? {},
          });
        }
      }
      return items;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg);
    }
  }

  async getSandbox(sandboxId: string): Promise<Sandbox | null> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    const currentId = await this.getCurrentSandboxId(sandboxId);
    if (this.sandboxes.has(currentId)) return this.sandboxes.get(currentId)!;

    try {
      const sandbox = await Sandbox.connect(currentId, {
        apiKey: env().e2bApiKey,
        requestTimeoutMs: CONNECT_TIMEOUT_MS,
      });
      this.sandboxes.set(currentId, sandbox);
      return sandbox;
    } catch (err) {
      if (isTimeoutOrNetworkError(err)) {
        throw new SandboxGoneError();
      }
      return null;
    }
  }

  /**
   * Return PocketBase preview info for a sandbox.
   */
  async getPocketbaseInfo(sandboxId: string): Promise<PocketbaseInfo | null> {
    const currentId = await this.getCurrentSandboxId(sandboxId);
    return this.state.getPocketbaseInfo(currentId);
  }

  /**
   * Resolve the PocketBase template directory for a given category, whether running
   * from TypeScript source or compiled JavaScript in dist/.
   */
  private async resolvePocketbaseTemplateDir(category: string): Promise<string> {
    const normalizedCategory = category.replace(/[ -]/g, '_').toLowerCase();
    // Each category is now a self-contained full-stack template: storefront + admin
    // dashboard live at the category root and the PocketBase backend (migrations/
    // hooks) lives in the inner `<category>/pocketbase/` directory.
    const fromDist = path.resolve(process.cwd(), 'dist', 'templates', normalizedCategory, 'pocketbase');
    const fromSource = path.resolve(process.cwd(), 'src', 'templates', normalizedCategory, 'pocketbase');
    try {
      const stat = await fs.stat(fromDist);
      if (stat.isDirectory()) return fromDist;
    } catch {
      // fall through
    }
    return fromSource;
  }

  private async setupPocketbase(
    sandbox: Sandbox,
  ): Promise<{ url: string; adminEmail: string; adminPassword: string }> {
    const credentials = generateSandboxPocketbaseCredentials();

    // Create PocketBase directories
    try {
      await sandbox.files.makeDir(POCKETBASE_DIR);
      await sandbox.files.makeDir(`${POCKETBASE_DIR}/pb_migrations`);
      await sandbox.files.makeDir(`${POCKETBASE_DIR}/pb_hooks`);
    } catch {
      // directories may already exist
    }

    // Download PocketBase binary
    const downloadRes = await sandbox.commands.run(
      `cd ${POCKETBASE_DIR} && wget -qO pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip" && unzip -q pocketbase.zip && rm pocketbase.zip && chmod +x pocketbase`,
      { cwd: POCKETBASE_DIR },
    );
    if (downloadRes.exitCode !== 0) {
      throw new Error(`PocketBase download failed: ${downloadRes.stderr || downloadRes.stdout}`);
    }

    // Write migration and hook files from the built-in template.
    // resolvePocketbaseTemplateDir returns the inner `pocketbase/` directory.
    const category = 'ecommerce';
    const templateDir = await this.resolvePocketbaseTemplateDir(category);
    const migrationFile = '1749767600_ecommerce.js';
    const migrationSource = path.join(templateDir, 'pb_migrations', migrationFile);
    const hookSource = path.join(templateDir, 'pb_hooks', 'main.pb.js');

    try {
      const migrationContent = await fs.readFile(migrationSource, 'utf-8');
      const hookContent = await fs.readFile(hookSource, 'utf-8');
      await sandbox.files.write(`${POCKETBASE_DIR}/pb_migrations/${migrationFile}`, migrationContent);
      await sandbox.files.write(`${POCKETBASE_DIR}/pb_hooks/main.pb.js`, hookContent);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not copy PocketBase template files: ${message}`);
    }

    // Initialize the PocketBase data directory and create the first admin.
    // In PocketBase 0.22.x the CLI subcommand is `admin create` (not
    // `superuser create`) and it must run after `migrate up` has initialized
    // the internal `_migrations` table.
    await this.initializePocketbaseData(sandbox.sandboxId, credentials);

    const pbHost = sandbox.getHost(POCKETBASE_PORT);
    return {
      url: `https://${pbHost}`,
      adminEmail: credentials.adminEmail,
      adminPassword: credentials.adminPassword,
    };
  }

  private async startPocketbase(
    sandboxId: string,
    pbInfo?: { url: string; adminEmail: string; adminPassword: string },
  ): Promise<boolean> {
    // Stop any existing PocketBase process first
    await this.runCommand(sandboxId, 'pkill -f "[p]ocketbase serve" || true', POCKETBASE_DIR);

    // Use the same daemonizing pattern as the Vite dev server so the process
    // survives after the E2B command shell exits.
    const res = await this.runCommand(
      sandboxId,
      `setsid nohup ${POCKETBASE_DIR}/pocketbase serve --http=0.0.0.0:${POCKETBASE_PORT} --dir=${POCKETBASE_DIR}/pb_data --migrationsDir=${POCKETBASE_DIR}/pb_migrations --hooksDir=${POCKETBASE_DIR}/pb_hooks > /tmp/pocketbase.log 2>&1 < /dev/null &`,
      POCKETBASE_DIR,
    );
    if (res.exitCode !== 0) {
      return false;
    }

    // Wait for PocketBase to actually accept connections before exposing the URL.
    // We poll the public E2B host because that is exactly what the frontend will
    // open; if it is reachable here, it will be reachable for the user.
    if (pbInfo) {
      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const health = await this.previewHealth(`${pbInfo.url}/api/health`);
        if (health.reachable) {
          await this.state.setPocketbaseInfo(sandboxId, pbInfo);
          return true;
        }
      }
    }

    // Health check timed out — collect PocketBase logs for diagnosis.
    const logResult = await this.runCommand(
      sandboxId,
      'tail -n 50 /tmp/pocketbase.log 2>/dev/null || echo "(no pocketbase log)"',
      POCKETBASE_DIR,
    );
    this.logger.warn(
      `PocketBase for sandbox ${sandboxId} did not become reachable within 60s. ` +
        `Recent pocketbase log:\n${logResult.output || logResult.error || '(empty)'}`,
    );
    return false;
  }

  /**
   * Run `migrate up` and create the first admin account for a sandbox PocketBase
   * instance. PocketBase 0.22.x requires the internal tables to be initialized
   * before `admin create` can be used, so the two commands are always executed
   * together.
   */
  private async initializePocketbaseData(
    sandboxId: string,
    pbInfo: { adminEmail: string; adminPassword: string },
  ): Promise<void> {
    const migrateRes = await this.runCommand(
      sandboxId,
      `cd ${POCKETBASE_DIR} && ./pocketbase migrate up --dir=${POCKETBASE_DIR}/pb_data --migrationsDir=${POCKETBASE_DIR}/pb_migrations --hooksDir=${POCKETBASE_DIR}/pb_hooks`,
      POCKETBASE_DIR,
    );
    if (migrateRes.exitCode !== 0) {
      this.logger.warn(`PocketBase migrate up output: ${migrateRes.output || migrateRes.error}`);
    }

    const adminRes = await this.runCommand(
      sandboxId,
      `cd ${POCKETBASE_DIR} && ./pocketbase admin create "${pbInfo.adminEmail}" "${pbInfo.adminPassword}" --dir=${POCKETBASE_DIR}/pb_data --migrationsDir=${POCKETBASE_DIR}/pb_migrations --hooksDir=${POCKETBASE_DIR}/pb_hooks`,
      POCKETBASE_DIR,
    );
    const adminOutput = adminRes.output || adminRes.error || '';
    if (adminRes.exitCode !== 0 || adminOutput.toLowerCase().includes('error:')) {
      this.logger.warn(`PocketBase admin create output: ${adminOutput}`);
    }
  }

  /**
   * Reconfigure the sandbox PocketBase instance for a specific website category.
   * This wipes existing PocketBase data, installs the category-specific migrations,
   * restarts PocketBase, and re-creates the admin user. Intended for use right
   * after the template_selector copies the correct category template into a fresh
   * new_app sandbox.
   */
  async reconfigurePocketbaseForCategory(
    sandboxId: string,
    category: string,
  ): Promise<{ url: string; adminEmail: string; adminPassword: string } | null> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }

    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new SandboxNotFoundError();
    }

    // Reuse existing credentials if they exist; otherwise generate new ones.
    const existing = await this.state.getPocketbaseInfo(sandboxId);
    const pbInfo: PocketbaseInfo = existing ?? {
      ...generateSandboxPocketbaseCredentials(),
      url: `https://${sandbox.getHost(POCKETBASE_PORT)}`,
    };

    // Stop any running PocketBase process and wipe the data directory,
    // migrations, and hooks so the new category starts from a clean slate.
    await this.runCommand(sandboxId, 'pkill -f "[p]ocketbase serve" || true', POCKETBASE_DIR);
    await this.runCommand(sandboxId, `rm -rf ${POCKETBASE_DIR}/pb_data ${POCKETBASE_DIR}/pb_migrations ${POCKETBASE_DIR}/pb_hooks`, POCKETBASE_DIR);

    // Create fresh directories.
    try {
      await sandbox.files.makeDir(`${POCKETBASE_DIR}/pb_migrations`);
      await sandbox.files.makeDir(`${POCKETBASE_DIR}/pb_hooks`);
    } catch {
      // directories may already exist
    }

    // Copy category-specific migration and hook files.
    // resolvePocketbaseTemplateDir returns the inner `pocketbase/` directory.
    const templateDir = await this.resolvePocketbaseTemplateDir(category);
    const migrationFile = `1749767600_${category}.js`;
    const migrationSource = path.join(templateDir, 'pb_migrations', migrationFile);
    const hookSource = path.join(templateDir, 'pb_hooks', 'main.pb.js');

    try {
      const migrationContent = await fs.readFile(migrationSource, 'utf-8');
      const hookContent = await fs.readFile(hookSource, 'utf-8');
      await sandbox.files.write(`${POCKETBASE_DIR}/pb_migrations/${migrationFile}`, migrationContent);
      await sandbox.files.write(`${POCKETBASE_DIR}/pb_hooks/main.pb.js`, hookContent);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Could not copy PocketBase template files for category ${category}: ${message}`);
      return null;
    }

    // Initialize the data directory and create the admin before starting serve.
    await this.initializePocketbaseData(sandboxId, pbInfo);

    // Start PocketBase and wait for it to be reachable.
    const started = await this.startPocketbase(sandboxId, pbInfo);
    if (!started) {
      this.logger.error(`PocketBase did not become reachable after reconfiguration for category ${category}`);
      return null;
    }

    await this.ensurePocketbaseAdminUser(pbInfo);
    return pbInfo;
  }

  /**
   * Prepare a sandbox for a Next.js + Prisma template (no PocketBase).
   * Writes the .env (SQLite DATABASE_URL, JWT secret, app URL), installs deps,
   * generates the Prisma client, applies the schema and runs the idempotent
   * seed (creates the default admin user).
   */
  async prepareNextSandbox(
    sandboxId: string,
    _category: string,
  ): Promise<{ ok: boolean; url: string }> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }
    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new SandboxNotFoundError();
    }
    this.frameworks.set(sandboxId, 'next');

    const appUrl = `https://${sandbox.getHost(NEXT_PORT)}`;
    const jwtSecret = randomBytes(32).toString('hex');
    const envContents = [
      'DATABASE_URL=file:./dev.db',
      `JWT_SECRET=${jwtSecret}`,
      `NEXT_PUBLIC_APP_URL=${appUrl}`,
      'NEXT_PUBLIC_SITE_NAME=My App',
    ].join('\n') + '\n';
    try {
      await sandbox.files.write(`${WORKDIR}/.env`, envContents);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not write Next.js .env for sandbox ${sandboxId}: ${message}`);
    }

    // createSandbox() may have started PocketBase for the legacy flow; a Next.js
    // site does not use it, so free the port/process.
    await this.runCommand(sandboxId, 'pkill -f "[p]ocketbase serve" || true', WORKDIR);

    await this.runCommand(sandboxId, 'test -d node_modules || npm install', WORKDIR, { timeoutMs: 300_000 });
    await this.runCommand(sandboxId, 'npx prisma generate', WORKDIR, { timeoutMs: 180_000 });

    const push = await this.runCommand(
      sandboxId,
      'npx prisma db push --accept-data-loss --skip-generate',
      WORKDIR,
      { timeoutMs: 180_000 },
    );
    if (push.exitCode !== 0) {
      this.logger.warn(`prisma db push failed for sandbox ${sandboxId}: ${push.error || push.output}`);
      return { ok: false, url: appUrl };
    }

    const seed = await this.runCommand(sandboxId, 'npx prisma db seed', WORKDIR, { timeoutMs: 120_000 });
    if (seed.exitCode !== 0) {
      this.logger.warn(`prisma db seed failed for sandbox ${sandboxId}: ${seed.error || seed.output}`);
    }

    return { ok: true, url: appUrl };
  }

  /**
   * Ensure the generated storefront has an admin user matching the PocketBase
   * superuser credentials. The admin dashboard signs in through the `users`
   * collection, not the PocketBase admin API, so a users record with role=admin
   * is required for the provided credentials to work.
   *
   * This is a fallback/verifier: the admin user is now seeded by the PocketBase
   * migration `1749767601_seed_admin_user.js`, but we retry here to ensure the
   * record exists and has the correct role even if PocketBase was slow to start.
   */
  private async ensurePocketbaseAdminUser(pbInfo: {
    url: string;
    adminEmail: string;
    adminPassword: string;
  }): Promise<void> {
    const maxAttempts = 5;
    const baseDelayMs = 500;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const authRes = await fetch(`${pbInfo.url}/api/admins/auth-with-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity: pbInfo.adminEmail, password: pbInfo.adminPassword }),
        });
        if (!authRes.ok) {
          const reason = `PocketBase admin auth failed for seeding admin user: ${authRes.status}`;
          if (attempt < maxAttempts) {
            this.logger.debug(`${reason}; retrying (${attempt}/${maxAttempts})`);
            await sleep(baseDelayMs * attempt);
            continue;
          }
          this.logger.warn(reason);
          return;
        }

        const authJson = (await authRes.json()) as { token?: string; admin?: unknown };
        const token = authJson.token;
        if (!token) {
          this.logger.warn('PocketBase admin auth response missing token');
          return;
        }

        const listRes = await fetch(
          `${pbInfo.url}/api/collections/users/records?filter=${encodeURIComponent(`email='${pbInfo.adminEmail}'`)}`,
          { headers: { Authorization: token } },
        );
        const listJson = (await listRes.json()) as { items?: Array<{ id: string }> };
        const existing = listJson.items?.[0];

        if (existing) {
          const patchRes = await fetch(`${pbInfo.url}/api/collections/users/records/${existing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: token },
            body: JSON.stringify({ role: 'admin', emailVisibility: true, verified: true }),
          });
          if (patchRes.ok) {
            this.logger.debug(`PocketBase admin user verified: ${pbInfo.adminEmail}`);
          } else {
            this.logger.warn(`Could not update PocketBase admin user role: ${patchRes.status}`);
          }
          return;
        }

        const createRes = await fetch(`${pbInfo.url}/api/collections/users/records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token },
          body: JSON.stringify({
            email: pbInfo.adminEmail,
            password: pbInfo.adminPassword,
            passwordConfirm: pbInfo.adminPassword,
            role: 'admin',
            emailVisibility: true,
            verified: true,
          }),
        });
        if (createRes.ok) {
          this.logger.debug(`PocketBase admin user seeded: ${pbInfo.adminEmail}`);
        } else {
          const createJson = (await createRes.json().catch(() => ({}))) as { message?: string };
          this.logger.warn(`Could not seed PocketBase admin user: ${createJson.message ?? createRes.status}`);
        }
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (attempt < maxAttempts) {
          this.logger.debug(`ensurePocketbaseAdminUser attempt ${attempt} failed: ${message}; retrying...`);
          await sleep(baseDelayMs * attempt);
          continue;
        }
        this.logger.warn(`ensurePocketbaseAdminUser failed after ${maxAttempts} attempts: ${message}`);
      }
    }
  }

  private async initializeProject(
    sandbox: Sandbox,
  ): Promise<{ ok: boolean; output: string; error: string; exitCode: number }> {
    try {
      await sandbox.files.makeDir(WORKDIR);
      await sandbox.files.makeDir(`${WORKDIR}/src`);
    } catch {
      // directories may already exist
    }

    // The agent's template_selector node will copy the full project template
    // (including package.json, configs, and src files) and run npm install.
    return { ok: true, output: '', error: '', exitCode: 0 };
  }

  private previewUrl(sandbox: Sandbox, framework: SandboxFramework = 'vite'): string {
    return `https://${sandbox.getHost(portFor(framework))}`;
  }

  /**
   * Detect the framework running inside a sandbox by inspecting its files.
   * Next.js templates carry a next.config.* (and an src/app router); Vite SPAs
   * carry a vite.config.* / index.html. Result is cached in memory.
   */
  async detectFramework(sandboxId: string): Promise<SandboxFramework> {
    const cached = this.frameworks.get(sandboxId);
    if (cached) return cached;

    let framework: SandboxFramework = 'vite';
    try {
      const probe = await this.runCommand(
        sandboxId,
        `if ls ${WORKDIR}/next.config.* >/dev/null 2>&1; then echo next; elif [ -d ${WORKDIR}/src/app ] && [ ! -f ${WORKDIR}/vite.config.ts ]; then echo next; else echo vite; fi`,
        WORKDIR,
      );
      if (probe.output.trim() === 'next') framework = 'next';
    } catch {
      framework = 'vite';
    }
    this.frameworks.set(sandboxId, framework);
    return framework;
  }

  /**
   * Public helper to resolve the preview URL for a sandbox (framework-aware).
   * Uses the E2B port-specific host so the dev server is reachable.
   */
  async getPreviewUrl(sandboxId: string): Promise<string> {
    if (!this.configured) {
      throw new E2BNotConfiguredError();
    }
    const sandbox = await this.getSandbox(sandboxId);
    if (!sandbox) {
      throw new SandboxNotFoundError();
    }
    const framework = await this.detectFramework(sandboxId);
    return this.previewUrl(sandbox, framework);
  }

  /**
   * Public helper used by sandbox controllers to resolve the current URL.
   */
  async getSandboxUrl(sandboxId: string): Promise<string> {
    return this.getPreviewUrl(sandboxId);
  }
}
