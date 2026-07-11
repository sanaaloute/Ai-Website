"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var E2BService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.E2BService = exports.E2BProviderError = exports.SandboxGoneError = exports.SandboxNotFoundError = exports.E2BNotConfiguredError = exports.FORBIDDEN_FILE_NAMES = exports.FORBIDDEN_PATH_PREFIXES = exports.WORKDIR = void 0;
exports.isForbiddenPath = isForbiddenPath;
const common_1 = require("@nestjs/common");
const e2b_1 = require("e2b");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const node_crypto_1 = require("node:crypto");
const env_1 = require("../config/env");
const pocketbase_service_1 = require("./pocketbase.service");
const template_service_1 = require("../modules/agent/services/template.service");
const sandbox_state_service_1 = require("./sandbox-state.service");
exports.WORKDIR = '/home/user/app';
const PORT = 5173;
const NEXT_PORT = 3000;
const VITE_LOG = '/tmp/vite.log';
const NEXT_LOG = '/tmp/next.log';
const POCKETBASE_PORT = 8090;
const POCKETBASE_DIR = '/home/user/pb';
const POCKETBASE_VERSION = '0.22.46';
const CONNECT_TIMEOUT_MS = 10_000;
const CREATE_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 30_000;
const SANDBOX_LIFETIME_MS = 60 * 60 * 1000;
function isTimeoutOrNetworkError(err) {
    if (!(err instanceof Error))
        return false;
    const msg = err.message.toLowerCase();
    return (msg.includes('timeout') ||
        msg.includes('aborted') ||
        msg.includes('eai_again') ||
        msg.includes('fetch failed') ||
        msg.includes('network'));
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.FORBIDDEN_PATH_PREFIXES = [
    'node_modules/',
    '.git/',
    '.next/',
    'dist/',
    '.agent_state/',
];
exports.FORBIDDEN_FILE_NAMES = new Set([
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'bun.lockb',
]);
function portFor(framework) {
    return framework === 'next' ? NEXT_PORT : PORT;
}
function logFor(framework) {
    return framework === 'next' ? NEXT_LOG : VITE_LOG;
}
function isForbiddenPath(relativePath) {
    const normalized = path.posix.normalize(relativePath).replace(/^\.\//, '').replace(/^\//, '');
    if (exports.FORBIDDEN_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
        return true;
    }
    const lower = normalized.toLowerCase();
    if (lower === 'node_modules' || lower === '.git' || lower === '.next' || lower === 'dist') {
        return true;
    }
    const basename = path.posix.basename(normalized);
    return exports.FORBIDDEN_FILE_NAMES.has(basename);
}
class E2BNotConfiguredError extends Error {
    constructor() {
        super('E2B_NOT_CONFIGURED');
    }
}
exports.E2BNotConfiguredError = E2BNotConfiguredError;
class SandboxNotFoundError extends Error {
    constructor() {
        super('SANDBOX_NOT_FOUND');
    }
}
exports.SandboxNotFoundError = SandboxNotFoundError;
class SandboxGoneError extends Error {
    constructor() {
        super('SANDBOX_GONE');
    }
}
exports.SandboxGoneError = SandboxGoneError;
class E2BProviderError extends Error {
    constructor(message) {
        super(message);
    }
}
exports.E2BProviderError = E2BProviderError;
let E2BService = E2BService_1 = class E2BService {
    constructor(state) {
        this.state = state;
        this.logger = new common_1.Logger(E2BService_1.name);
        this.sandboxes = new Map();
        this.frameworks = new Map();
    }
    get configured() {
        return !!(0, env_1.env)().e2bApiKey;
    }
    async createSandbox(opts) {
        if (!this.configured) {
            throw new E2BNotConfiguredError();
        }
        let sandbox;
        try {
            sandbox = await e2b_1.Sandbox.create({
                apiKey: (0, env_1.env)().e2bApiKey,
                timeoutMs: SANDBOX_LIFETIME_MS,
                requestTimeoutMs: CREATE_TIMEOUT_MS,
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`E2B createSandbox failed: ${message}`);
            throw new E2BProviderError(message);
        }
        this.sandboxes.set(sandbox.sandboxId, sandbox);
        this.frameworks.set(sandbox.sandboxId, 'vite');
        const createdAt = new Date().toISOString();
        const endAt = new Date(Date.now() + SANDBOX_LIFETIME_MS).toISOString();
        let initRes;
        if (!opts?.skipSetup) {
            initRes = await this.initializeProject(sandbox);
            try {
                await sandbox.files.write(`${exports.WORKDIR}/.env`, 'VITE_POCKETBASE_URL=/\n');
            }
            catch (envErr) {
                const message = envErr instanceof Error ? envErr.message : String(envErr);
                this.logger.warn(`Could not write storefront .env for sandbox ${sandbox.sandboxId}: ${message}`);
            }
        }
        if (initRes && !initRes.ok) {
            const message = `Sandbox project initialization failed. exitCode=${initRes.exitCode} stdout=${initRes.output} stderr=${initRes.error}`;
            this.logger.error(message);
            try {
                await sandbox.kill();
            }
            catch { }
            this.sandboxes.delete(sandbox.sandboxId);
            throw new E2BProviderError(message);
        }
        let pbInfo;
        try {
            pbInfo = await this.setupPocketbase(sandbox);
            const started = await this.startPocketbase(sandbox.sandboxId, pbInfo);
            if (!started) {
                this.logger.warn(`PocketBase did not become reachable for sandbox ${sandbox.sandboxId}`);
            }
            else if (pbInfo) {
                await this.ensurePocketbaseAdminUser(pbInfo);
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`PocketBase setup failed for sandbox ${sandbox.sandboxId}: ${message}`);
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
    async getCurrentSandboxId(sandboxId) {
        return this.state.getCurrentSandboxId(sandboxId);
    }
    async getSandboxLifetime(sandboxId) {
        if (!this.configured)
            return null;
        const currentId = await this.getCurrentSandboxId(sandboxId);
        const cached = await this.state.getSandboxInfo(currentId);
        if (cached) {
            return { createdAt: cached.createdAt, endAt: cached.endAt };
        }
        try {
            const info = await e2b_1.Sandbox.getInfo(currentId, {
                apiKey: (0, env_1.env)().e2bApiKey,
                requestTimeoutMs: REQUEST_TIMEOUT_MS,
            });
            return {
                createdAt: info.startedAt.toISOString(),
                endAt: info.endAt.toISOString(),
            };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Could not fetch lifecycle info for sandbox ${currentId}: ${msg}`);
            return null;
        }
    }
    async attach(sandboxId) {
        if (!this.configured) {
            throw new E2BNotConfiguredError();
        }
        const currentId = await this.getCurrentSandboxId(sandboxId);
        try {
            const sandbox = await e2b_1.Sandbox.connect(currentId, {
                apiKey: (0, env_1.env)().e2bApiKey,
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
        }
        catch (err) {
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
    async kill(sandboxId) {
        if (!this.configured) {
            throw new E2BNotConfiguredError();
        }
        const currentId = await this.getCurrentSandboxId(sandboxId);
        try {
            const sandbox = this.sandboxes.get(currentId) ??
                (await e2b_1.Sandbox.connect(currentId, {
                    apiKey: (0, env_1.env)().e2bApiKey,
                    requestTimeoutMs: CONNECT_TIMEOUT_MS,
                }));
            await sandbox.kill();
            this.sandboxes.delete(currentId);
            await this.state.clearSandboxState(currentId);
            return true;
        }
        catch {
            this.sandboxes.delete(currentId);
            await this.state.clearSandboxState(currentId);
            return false;
        }
    }
    async getSandboxInfos() {
        const entries = await this.state.listSandboxInfos();
        return entries.map(({ sandboxId, info }) => ({
            sandboxId,
            ...info,
        }));
    }
    async setRenewing(sandboxId, renewing) {
        const currentId = await this.getCurrentSandboxId(sandboxId);
        const info = await this.state.getSandboxInfo(currentId);
        if (info) {
            await this.state.setSandboxInfo(currentId, { ...info, renewing });
        }
    }
    async removeSandboxInfo(sandboxId) {
        const currentId = await this.getCurrentSandboxId(sandboxId);
        this.sandboxes.delete(currentId);
        await this.state.clearSandboxState(currentId);
    }
    async snapshotSandbox(sandboxId, snapshotId) {
        if (!this.configured) {
            throw new E2BNotConfiguredError();
        }
        const currentId = await this.getCurrentSandboxId(sandboxId);
        const sandbox = await this.getSandbox(currentId);
        if (!sandbox) {
            throw new SandboxNotFoundError();
        }
        const snapshotDir = `${exports.WORKDIR}/.agent_state/snapshots`;
        const excludes = ["node_modules", ".git", "dist", ".next", ".agent_state"]
            .map((dir) => `--exclude='${dir}'`)
            .join(" ");
        const snapshotCmd = `mkdir -p ${snapshotDir} && ` +
            `tar -czf ${snapshotDir}/${snapshotId}.tar.gz ${excludes} -C ${exports.WORKDIR} . && ` +
            `cd ${exports.WORKDIR} && find . -type f -not -path './node_modules/*' -not -path './.git/*' -not -path './dist/*' -not -path './.next/*' -not -path './.agent_state/*' | sed 's|^\\./||' | sort > ${snapshotDir}/${snapshotId}.manifest`;
        const result = await sandbox.commands.run(snapshotCmd, { timeoutMs: 60_000 });
        if (result.exitCode !== 0) {
            throw new Error(`Snapshot failed: ${result.stderr || result.stdout}`);
        }
        this.logger.log(`Created snapshot ${snapshotId} for sandbox ${currentId}`);
    }
    async restoreSandboxSnapshot(sandboxId, snapshotId) {
        if (!this.configured) {
            throw new E2BNotConfiguredError();
        }
        const currentId = await this.getCurrentSandboxId(sandboxId);
        const sandbox = await this.getSandbox(currentId);
        if (!sandbox) {
            throw new SandboxNotFoundError();
        }
        const snapshotDir = `${exports.WORKDIR}/.agent_state/snapshots`;
        const manifestPath = `${snapshotDir}/${snapshotId}.manifest`;
        const tarPath = `${snapshotDir}/${snapshotId}.tar.gz`;
        const check = await sandbox.commands.run(`test -f ${tarPath} && test -f ${manifestPath}`, {
            timeoutMs: 5_000,
        });
        if (check.exitCode !== 0) {
            this.logger.warn(`Snapshot ${snapshotId} not found for sandbox ${currentId}`);
            return false;
        }
        const restoreCmd = `cd ${exports.WORKDIR} && ` +
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
    async registerRenewal(oldId, newId) {
        const oldCurrent = await this.getCurrentSandboxId(oldId);
        const newCurrent = await this.getCurrentSandboxId(newId);
        if (oldCurrent === newCurrent)
            return;
        await this.state.setChain(oldCurrent, newCurrent);
        await this.state.deleteSandboxInfo(oldCurrent);
        await this.state.deletePocketbaseInfo(oldCurrent);
        this.sandboxes.delete(oldCurrent);
    }
    async renewSandbox(oldSandboxId) {
        const currentId = await this.getCurrentSandboxId(oldSandboxId);
        if (currentId !== oldSandboxId) {
            const data = await this.attach(currentId);
            return { ...data, filesMigrated: 0 };
        }
        const acquired = await this.state.acquireRenewalLock(currentId);
        if (!acquired) {
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
        }
        finally {
            await this.state.releaseRenewalLock(currentId);
        }
    }
    async doRenewSandbox(currentId) {
        const start = Date.now();
        const files = await this.readFiles(currentId, { maxFiles: 1000 });
        const newSandbox = await this.createSandbox();
        try {
            for (const [path, content] of Object.entries(files.files)) {
                await this.writeFile(newSandbox.sandboxId, path, content);
            }
            if (!files.files['package.json']) {
                this.logger.warn(`Renewed sandbox ${newSandbox.sandboxId} is missing package.json; seeding generic template`);
                for (const [templatePath, templateContent] of Object.entries(template_service_1.MINIMAL_GENERIC_TEMPLATE)) {
                    await this.writeFile(newSandbox.sandboxId, templatePath, templateContent);
                }
            }
            const installRes = await this.runCommand(newSandbox.sandboxId, 'npm install', exports.WORKDIR, {
                timeoutMs: 5 * 60 * 1000,
            });
            if (installRes.exitCode !== 0) {
                this.logger.error(`npm install failed in renewed sandbox ${newSandbox.sandboxId}: exitCode=${installRes.exitCode}, stdout=${installRes.output}, stderr=${installRes.error}`);
                throw new Error(`npm install failed: ${installRes.error || installRes.output}`);
            }
            const restarted = await this.restartPreview(newSandbox.sandboxId);
            if (!restarted) {
                throw new Error('Failed to start dev server in renewed sandbox');
            }
            try {
                await this.kill(currentId);
            }
            catch (killErr) {
                const msg = killErr instanceof Error ? killErr.message : String(killErr);
                this.logger.warn(`Failed to kill old sandbox ${currentId} after renewal: ${msg}`);
            }
            await this.registerRenewal(currentId, newSandbox.sandboxId);
            const filesMigrated = Object.keys(files.files).length;
            this.logger.log(`Renewed sandbox ${currentId} -> ${newSandbox.sandboxId} (${filesMigrated} files, ${Date.now() - start}ms)`);
            return {
                ...newSandbox,
                filesMigrated,
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`Sandbox renewal failed for ${currentId}: ${message}`);
            try {
                await this.kill(newSandbox.sandboxId);
            }
            catch {
            }
            throw err;
        }
    }
    async runCommand(sandboxId, command, cwd = exports.WORKDIR, opts) {
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
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('gone')) {
                const currentId = await this.getCurrentSandboxId(sandboxId);
                this.sandboxes.delete(currentId);
                throw new SandboxGoneError();
            }
            throw new Error(msg);
        }
    }
    async readFile(sandboxId, relativePath) {
        if (!this.configured) {
            throw new E2BNotConfiguredError();
        }
        const sandbox = await this.getSandbox(sandboxId);
        if (!sandbox) {
            throw new SandboxNotFoundError();
        }
        try {
            return await sandbox.files.read(`${exports.WORKDIR}/${relativePath}`);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('not found') || msg.includes('does not exist')) {
                return null;
            }
            throw new Error(msg);
        }
    }
    async ensureAlive(sandboxId) {
        return this.attach(sandboxId);
    }
    async readFiles(sandboxId, opts) {
        if (!this.configured) {
            throw new E2BNotConfiguredError();
        }
        const sandbox = await this.getSandbox(sandboxId);
        if (!sandbox) {
            throw new SandboxNotFoundError();
        }
        try {
            const excludePrefixes = opts?.excludePrefixes ?? exports.FORBIDDEN_PATH_PREFIXES;
            const findExcludes = excludePrefixes
                .map((prefix) => {
                const dir = prefix.replace(/\/$/, '');
                return `-not -path '*/${dir}/*'`;
            })
                .join(' ');
            const tree = await sandbox.commands.run(`find ${exports.WORKDIR} -type f ${findExcludes} | sort`);
            const paths = tree.stdout.split('\n').filter(Boolean).map((p) => p.replace(`${exports.WORKDIR}/`, ''));
            const files = {};
            const maxFiles = opts?.maxFiles === null ? undefined : (opts?.maxFiles ?? 200);
            const pathsToRead = maxFiles ? paths.slice(0, maxFiles) : paths;
            for (const p of pathsToRead) {
                try {
                    const content = await sandbox.files.read(`${exports.WORKDIR}/${p}`);
                    files[p] = content;
                }
                catch {
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
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('gone')) {
                const currentId = await this.getCurrentSandboxId(sandboxId);
                this.sandboxes.delete(currentId);
                throw new SandboxGoneError();
            }
            throw new Error(msg);
        }
    }
    async writeFile(sandboxId, relativePath, content) {
        if (!this.configured) {
            throw new E2BNotConfiguredError();
        }
        if (isForbiddenPath(relativePath)) {
            this.logger.debug(`writeFile rejected forbidden path: ${relativePath}`);
            return false;
        }
        return this.writeFileInternal(sandboxId, relativePath, content);
    }
    async writeSystemFile(sandboxId, relativePath, content) {
        if (!this.configured) {
            throw new E2BNotConfiguredError();
        }
        return this.writeFileInternal(sandboxId, relativePath, content);
    }
    async deleteFile(sandboxId, relativePath) {
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
            const fullPath = `${exports.WORKDIR}/${relativePath}`;
            await sandbox.files.remove(fullPath);
            this.logger.debug(`deleteFile ok: ${fullPath}`);
            return true;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('gone')) {
                const currentId = await this.getCurrentSandboxId(sandboxId);
                this.sandboxes.delete(currentId);
                throw new SandboxGoneError();
            }
            throw new Error(msg);
        }
    }
    async renameFile(sandboxId, relativePath, newRelativePath) {
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
            const fullPath = `${exports.WORKDIR}/${relativePath}`;
            const newFullPath = `${exports.WORKDIR}/${newRelativePath}`;
            await sandbox.files.rename(fullPath, newFullPath);
            this.logger.debug(`renameFile ok: ${fullPath} -> ${newFullPath}`);
            return true;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('gone')) {
                const currentId = await this.getCurrentSandboxId(sandboxId);
                this.sandboxes.delete(currentId);
                throw new SandboxGoneError();
            }
            throw new Error(msg);
        }
    }
    async writeFileInternal(sandboxId, relativePath, content) {
        const sandbox = await this.getSandbox(sandboxId);
        if (!sandbox) {
            throw new SandboxNotFoundError();
        }
        try {
            const fullPath = `${exports.WORKDIR}/${relativePath}`;
            const dir = path.dirname(fullPath);
            if (dir && dir !== exports.WORKDIR && dir !== `${exports.WORKDIR}/` && dir !== '/') {
                const mkdirRes = await this.runCommand(sandboxId, `mkdir -p ${dir}`, exports.WORKDIR);
                if (mkdirRes.exitCode !== 0) {
                    this.logger.error(`writeFile mkdir failed for ${fullPath}: exitCode=${mkdirRes.exitCode}, stderr=${mkdirRes.error}, stdout=${mkdirRes.output}`);
                }
                else {
                    this.logger.debug(`writeFile mkdir ok for ${fullPath}`);
                }
            }
            await sandbox.files.write(fullPath, content);
            this.logger.debug(`writeFile ok: ${fullPath}`);
            return true;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('gone')) {
                const currentId = await this.getCurrentSandboxId(sandboxId);
                this.sandboxes.delete(currentId);
                throw new SandboxGoneError();
            }
            throw new Error(msg);
        }
    }
    async restartPreview(sandboxId) {
        if (!this.configured) {
            throw new E2BNotConfiguredError();
        }
        const framework = await this.detectFramework(sandboxId);
        const log = logFor(framework);
        const killPattern = framework === 'next' ? 'pkill -f "[n]ext" || true' : 'pkill -f "[v]ite" || true';
        await this.runCommand(sandboxId, killPattern, exports.WORKDIR);
        const sandbox = await this.getSandbox(sandboxId);
        if (!sandbox) {
            throw new SandboxNotFoundError();
        }
        await this.runCommand(sandboxId, 'test -d node_modules || npm install', exports.WORKDIR, { timeoutMs: 300_000 });
        if (framework === 'next') {
            await this.runCommand(sandboxId, 'test -d node_modules/@prisma/client || npx prisma generate', exports.WORKDIR, { timeoutMs: 180_000 });
        }
        const res = await this.runCommand(sandboxId, `setsid nohup npm run dev > ${log} 2>&1 < /dev/null &`, exports.WORKDIR);
        if (res.exitCode !== 0) {
            return false;
        }
        const url = this.previewUrl(sandbox, framework);
        const deadline = Date.now() + (framework === 'next' ? 90_000 : 60_000);
        while (Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const health = await this.previewHealth(url);
            if (health.reachable) {
                return true;
            }
        }
        const logResult = await this.runCommand(sandboxId, `tail -n 60 ${log} 2>/dev/null || echo "(no dev log)"`, exports.WORKDIR);
        const lastHealth = await this.previewHealth(url);
        this.logger.warn(`${framework === 'next' ? 'Next.js' : 'Vite'} dev server for sandbox ${sandboxId} did not become reachable within ${framework === 'next' ? 90 : 60}s. ` +
            `Status code: ${lastHealth.statusCode ?? 'none'}. ` +
            `Recent log:\n${logResult.output || logResult.error || '(empty)'}`);
        return false;
    }
    async previewHealth(previewUrl) {
        if (!this.configured) {
            throw new E2BNotConfiguredError();
        }
        try {
            const res = await fetch(previewUrl, { method: 'GET' });
            return { reachable: res.ok, statusCode: res.status };
        }
        catch {
            return { reachable: false };
        }
    }
    async listRunning() {
        if (!this.configured) {
            throw new E2BNotConfiguredError();
        }
        try {
            const paginator = e2b_1.Sandbox.list({ apiKey: (0, env_1.env)().e2bApiKey, requestTimeoutMs: REQUEST_TIMEOUT_MS });
            const items = [];
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
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(msg);
        }
    }
    async getSandbox(sandboxId) {
        if (!this.configured) {
            throw new E2BNotConfiguredError();
        }
        const currentId = await this.getCurrentSandboxId(sandboxId);
        if (this.sandboxes.has(currentId))
            return this.sandboxes.get(currentId);
        try {
            const sandbox = await e2b_1.Sandbox.connect(currentId, {
                apiKey: (0, env_1.env)().e2bApiKey,
                requestTimeoutMs: CONNECT_TIMEOUT_MS,
            });
            this.sandboxes.set(currentId, sandbox);
            return sandbox;
        }
        catch (err) {
            if (isTimeoutOrNetworkError(err)) {
                throw new SandboxGoneError();
            }
            return null;
        }
    }
    async getPocketbaseInfo(sandboxId) {
        const currentId = await this.getCurrentSandboxId(sandboxId);
        return this.state.getPocketbaseInfo(currentId);
    }
    async resolvePocketbaseTemplateDir(category) {
        const normalizedCategory = category.replace(/[ -]/g, '_').toLowerCase();
        const fromDist = path.resolve(process.cwd(), 'dist', 'templates', normalizedCategory, 'pocketbase');
        const fromSource = path.resolve(process.cwd(), 'src', 'templates', normalizedCategory, 'pocketbase');
        try {
            const stat = await fs_1.promises.stat(fromDist);
            if (stat.isDirectory())
                return fromDist;
        }
        catch {
        }
        return fromSource;
    }
    async setupPocketbase(sandbox) {
        const credentials = (0, pocketbase_service_1.generateSandboxPocketbaseCredentials)();
        try {
            await sandbox.files.makeDir(POCKETBASE_DIR);
            await sandbox.files.makeDir(`${POCKETBASE_DIR}/pb_migrations`);
            await sandbox.files.makeDir(`${POCKETBASE_DIR}/pb_hooks`);
        }
        catch {
        }
        const downloadRes = await sandbox.commands.run(`cd ${POCKETBASE_DIR} && wget -qO pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip" && unzip -q pocketbase.zip && rm pocketbase.zip && chmod +x pocketbase`, { cwd: POCKETBASE_DIR });
        if (downloadRes.exitCode !== 0) {
            throw new Error(`PocketBase download failed: ${downloadRes.stderr || downloadRes.stdout}`);
        }
        const category = 'ecommerce';
        const templateDir = await this.resolvePocketbaseTemplateDir(category);
        const migrationFile = '1749767600_ecommerce.js';
        const migrationSource = path.join(templateDir, 'pb_migrations', migrationFile);
        const hookSource = path.join(templateDir, 'pb_hooks', 'main.pb.js');
        try {
            const migrationContent = await fs_1.promises.readFile(migrationSource, 'utf-8');
            const hookContent = await fs_1.promises.readFile(hookSource, 'utf-8');
            await sandbox.files.write(`${POCKETBASE_DIR}/pb_migrations/${migrationFile}`, migrationContent);
            await sandbox.files.write(`${POCKETBASE_DIR}/pb_hooks/main.pb.js`, hookContent);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Could not copy PocketBase template files: ${message}`);
        }
        await this.initializePocketbaseData(sandbox.sandboxId, credentials);
        const pbHost = sandbox.getHost(POCKETBASE_PORT);
        return {
            url: `https://${pbHost}`,
            adminEmail: credentials.adminEmail,
            adminPassword: credentials.adminPassword,
        };
    }
    async startPocketbase(sandboxId, pbInfo) {
        await this.runCommand(sandboxId, 'pkill -f "[p]ocketbase serve" || true', POCKETBASE_DIR);
        const res = await this.runCommand(sandboxId, `setsid nohup ${POCKETBASE_DIR}/pocketbase serve --http=0.0.0.0:${POCKETBASE_PORT} --dir=${POCKETBASE_DIR}/pb_data --migrationsDir=${POCKETBASE_DIR}/pb_migrations --hooksDir=${POCKETBASE_DIR}/pb_hooks > /tmp/pocketbase.log 2>&1 < /dev/null &`, POCKETBASE_DIR);
        if (res.exitCode !== 0) {
            return false;
        }
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
        const logResult = await this.runCommand(sandboxId, 'tail -n 50 /tmp/pocketbase.log 2>/dev/null || echo "(no pocketbase log)"', POCKETBASE_DIR);
        this.logger.warn(`PocketBase for sandbox ${sandboxId} did not become reachable within 60s. ` +
            `Recent pocketbase log:\n${logResult.output || logResult.error || '(empty)'}`);
        return false;
    }
    async initializePocketbaseData(sandboxId, pbInfo) {
        const migrateRes = await this.runCommand(sandboxId, `cd ${POCKETBASE_DIR} && ./pocketbase migrate up --dir=${POCKETBASE_DIR}/pb_data --migrationsDir=${POCKETBASE_DIR}/pb_migrations --hooksDir=${POCKETBASE_DIR}/pb_hooks`, POCKETBASE_DIR);
        if (migrateRes.exitCode !== 0) {
            this.logger.warn(`PocketBase migrate up output: ${migrateRes.output || migrateRes.error}`);
        }
        const adminRes = await this.runCommand(sandboxId, `cd ${POCKETBASE_DIR} && ./pocketbase admin create "${pbInfo.adminEmail}" "${pbInfo.adminPassword}" --dir=${POCKETBASE_DIR}/pb_data --migrationsDir=${POCKETBASE_DIR}/pb_migrations --hooksDir=${POCKETBASE_DIR}/pb_hooks`, POCKETBASE_DIR);
        const adminOutput = adminRes.output || adminRes.error || '';
        if (adminRes.exitCode !== 0 || adminOutput.toLowerCase().includes('error:')) {
            this.logger.warn(`PocketBase admin create output: ${adminOutput}`);
        }
    }
    async reconfigurePocketbaseForCategory(sandboxId, category) {
        if (!this.configured) {
            throw new E2BNotConfiguredError();
        }
        const sandbox = await this.getSandbox(sandboxId);
        if (!sandbox) {
            throw new SandboxNotFoundError();
        }
        const existing = await this.state.getPocketbaseInfo(sandboxId);
        const pbInfo = existing ?? {
            ...(0, pocketbase_service_1.generateSandboxPocketbaseCredentials)(),
            url: `https://${sandbox.getHost(POCKETBASE_PORT)}`,
        };
        await this.runCommand(sandboxId, 'pkill -f "[p]ocketbase serve" || true', POCKETBASE_DIR);
        await this.runCommand(sandboxId, `rm -rf ${POCKETBASE_DIR}/pb_data ${POCKETBASE_DIR}/pb_migrations ${POCKETBASE_DIR}/pb_hooks`, POCKETBASE_DIR);
        try {
            await sandbox.files.makeDir(`${POCKETBASE_DIR}/pb_migrations`);
            await sandbox.files.makeDir(`${POCKETBASE_DIR}/pb_hooks`);
        }
        catch {
        }
        const templateDir = await this.resolvePocketbaseTemplateDir(category);
        const migrationFile = `1749767600_${category}.js`;
        const migrationSource = path.join(templateDir, 'pb_migrations', migrationFile);
        const hookSource = path.join(templateDir, 'pb_hooks', 'main.pb.js');
        try {
            const migrationContent = await fs_1.promises.readFile(migrationSource, 'utf-8');
            const hookContent = await fs_1.promises.readFile(hookSource, 'utf-8');
            await sandbox.files.write(`${POCKETBASE_DIR}/pb_migrations/${migrationFile}`, migrationContent);
            await sandbox.files.write(`${POCKETBASE_DIR}/pb_hooks/main.pb.js`, hookContent);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`Could not copy PocketBase template files for category ${category}: ${message}`);
            return null;
        }
        await this.initializePocketbaseData(sandboxId, pbInfo);
        const started = await this.startPocketbase(sandboxId, pbInfo);
        if (!started) {
            this.logger.error(`PocketBase did not become reachable after reconfiguration for category ${category}`);
            return null;
        }
        await this.ensurePocketbaseAdminUser(pbInfo);
        return pbInfo;
    }
    async prepareNextSandbox(sandboxId, _category) {
        if (!this.configured) {
            throw new E2BNotConfiguredError();
        }
        const sandbox = await this.getSandbox(sandboxId);
        if (!sandbox) {
            throw new SandboxNotFoundError();
        }
        this.frameworks.set(sandboxId, 'next');
        const appUrl = `https://${sandbox.getHost(NEXT_PORT)}`;
        const jwtSecret = (0, node_crypto_1.randomBytes)(32).toString('hex');
        const envContents = [
            'DATABASE_URL=file:./dev.db',
            `JWT_SECRET=${jwtSecret}`,
            `NEXT_PUBLIC_APP_URL=${appUrl}`,
            'NEXT_PUBLIC_SITE_NAME=My App',
        ].join('\n') + '\n';
        try {
            await sandbox.files.write(`${exports.WORKDIR}/.env`, envContents);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Could not write Next.js .env for sandbox ${sandboxId}: ${message}`);
        }
        await this.runCommand(sandboxId, 'pkill -f "[p]ocketbase serve" || true', exports.WORKDIR);
        await this.runCommand(sandboxId, 'test -d node_modules || npm install', exports.WORKDIR, { timeoutMs: 300_000 });
        await this.runCommand(sandboxId, 'npx prisma generate', exports.WORKDIR, { timeoutMs: 180_000 });
        const push = await this.runCommand(sandboxId, 'npx prisma db push --accept-data-loss --skip-generate', exports.WORKDIR, { timeoutMs: 180_000 });
        if (push.exitCode !== 0) {
            this.logger.warn(`prisma db push failed for sandbox ${sandboxId}: ${push.error || push.output}`);
            return { ok: false, url: appUrl };
        }
        const seed = await this.runCommand(sandboxId, 'npx prisma db seed', exports.WORKDIR, { timeoutMs: 120_000 });
        if (seed.exitCode !== 0) {
            this.logger.warn(`prisma db seed failed for sandbox ${sandboxId}: ${seed.error || seed.output}`);
        }
        return { ok: true, url: appUrl };
    }
    async ensurePocketbaseAdminUser(pbInfo) {
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
                const authJson = (await authRes.json());
                const token = authJson.token;
                if (!token) {
                    this.logger.warn('PocketBase admin auth response missing token');
                    return;
                }
                const listRes = await fetch(`${pbInfo.url}/api/collections/users/records?filter=${encodeURIComponent(`email='${pbInfo.adminEmail}'`)}`, { headers: { Authorization: token } });
                const listJson = (await listRes.json());
                const existing = listJson.items?.[0];
                if (existing) {
                    const patchRes = await fetch(`${pbInfo.url}/api/collections/users/records/${existing.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: token },
                        body: JSON.stringify({ role: 'admin', emailVisibility: true, verified: true }),
                    });
                    if (patchRes.ok) {
                        this.logger.debug(`PocketBase admin user verified: ${pbInfo.adminEmail}`);
                    }
                    else {
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
                }
                else {
                    const createJson = (await createRes.json().catch(() => ({})));
                    this.logger.warn(`Could not seed PocketBase admin user: ${createJson.message ?? createRes.status}`);
                }
                return;
            }
            catch (err) {
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
    async initializeProject(sandbox) {
        try {
            await sandbox.files.makeDir(exports.WORKDIR);
            await sandbox.files.makeDir(`${exports.WORKDIR}/src`);
        }
        catch {
        }
        return { ok: true, output: '', error: '', exitCode: 0 };
    }
    previewUrl(sandbox, framework = 'vite') {
        return `https://${sandbox.getHost(portFor(framework))}`;
    }
    async detectFramework(sandboxId) {
        const cached = this.frameworks.get(sandboxId);
        if (cached)
            return cached;
        let framework = 'vite';
        try {
            const probe = await this.runCommand(sandboxId, `if ls ${exports.WORKDIR}/next.config.* >/dev/null 2>&1; then echo next; elif [ -d ${exports.WORKDIR}/src/app ] && [ ! -f ${exports.WORKDIR}/vite.config.ts ]; then echo next; else echo vite; fi`, exports.WORKDIR);
            if (probe.output.trim() === 'next')
                framework = 'next';
        }
        catch {
            framework = 'vite';
        }
        this.frameworks.set(sandboxId, framework);
        return framework;
    }
    async getPreviewUrl(sandboxId) {
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
    async getSandboxUrl(sandboxId) {
        return this.getPreviewUrl(sandboxId);
    }
};
exports.E2BService = E2BService;
exports.E2BService = E2BService = E2BService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sandbox_state_service_1.SandboxStateService])
], E2BService);
//# sourceMappingURL=e2b.service.js.map