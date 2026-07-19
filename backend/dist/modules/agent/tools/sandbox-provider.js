"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxProvider = void 0;
const common_1 = require("@nestjs/common");
const e2b_service_1 = require("../../../lib/e2b.service");
const shell_1 = require("./shell");
const WORKSPACE_ROOT = '/home/user/app';
const DEFAULT_COMMAND_TIMEOUT_MS = 5 * 60 * 1000;
class SandboxProvider {
    constructor(e2b, sandboxId, projectId) {
        this.e2b = e2b;
        this.projectId = projectId;
        this.logger = new common_1.Logger(SandboxProvider.name);
        this.sandboxId = sandboxId;
    }
    get currentSandboxId() {
        return this.sandboxId;
    }
    async ensureAlive(_userId) {
        const data = await this.e2b.ensureAlive(this.sandboxId);
        if (!data) {
            throw new Error(`Sandbox ${this.sandboxId} is gone`);
        }
        this.sandboxId = data.sandboxId;
        return this.sandboxId;
    }
    async readFile(inputPath) {
        const relativePath = this.toRelativePath(inputPath);
        const content = await this.e2b.readFile(this.sandboxId, relativePath);
        if (content === null) {
            throw new Error(`Could not read ${relativePath}`);
        }
        return content;
    }
    async writeFile(inputPath, content) {
        const relativePath = this.toRelativePath(inputPath);
        if ((0, e2b_service_1.isForbiddenPath)(relativePath)) {
            throw new Error(`Cannot write ${relativePath}: generated or managed paths (dist/, node_modules/, .next/, .agent_state/, lock files, etc.) cannot be edited directly`);
        }
        const ok = await this.e2b.writeFile(this.sandboxId, relativePath, content);
        if (!ok) {
            throw new Error(`Could not write ${relativePath}`);
        }
    }
    async writeSystemFile(inputPath, content) {
        const relativePath = this.toRelativePath(inputPath);
        const ok = await this.e2b.writeSystemFile(this.sandboxId, relativePath, content);
        if (!ok) {
            throw new Error(`Could not write ${relativePath}`);
        }
    }
    async runCommand(command, cwd = WORKSPACE_ROOT, opts) {
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
    async listFiles(directory = WORKSPACE_ROOT) {
        const dir = this.toAbsolutePath(directory);
        const res = await this.e2b.runCommand(this.sandboxId, `find ${(0, shell_1.shellQuote)(dir)} -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' -not -path '*/dist/*' -not -path '*/.agent_state/*' | sort`, WORKSPACE_ROOT);
        const paths = (res.output || '')
            .split('\n')
            .filter(Boolean)
            .map((p) => p.replace(`${WORKSPACE_ROOT}/`, ''));
        return paths;
    }
    async getSandboxUrl() {
        return this.e2b.getPreviewUrl(this.sandboxId);
    }
    async startPocketBase(options) {
        const info = await this.e2b.getPocketbaseInfo(this.sandboxId);
        const templateId = options?.templateId || 'generic';
        if (!info) {
            throw new Error('PocketBase is not configured for this sandbox');
        }
        const collectionsCreated = [];
        let recordsSeeded = 0;
        try {
            const authRes = await fetch(`${info.url}/api/admins/auth-with-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity: info.adminEmail, password: info.adminPassword }),
            });
            if (!authRes.ok) {
                throw new Error(`PocketBase admin auth failed: ${authRes.status}`);
            }
            const authData = (await authRes.json());
            const token = authData.token;
            if (!token) {
                throw new Error('PocketBase admin auth returned no token');
            }
            const collectionsRes = await fetch(`${info.url}/api/collections`, {
                headers: { Authorization: token },
            });
            if (collectionsRes.ok) {
                const collectionsData = (await collectionsRes.json());
                const items = collectionsData.items ?? [];
                for (const item of items) {
                    if (item.name) {
                        collectionsCreated.push(item.name);
                        try {
                            const recordsRes = await fetch(`${info.url}/api/collections/${item.name}/records?perPage=1`, {
                                headers: { Authorization: token },
                            });
                            if (recordsRes.ok) {
                                const recordsData = (await recordsRes.json());
                                recordsSeeded += recordsData.totalItems ?? 0;
                            }
                        }
                        catch {
                        }
                    }
                }
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Could not inspect PocketBase collections: ${message}`);
        }
        return {
            url: info.url,
            template: { id: templateId },
            collectionsCreated,
            recordsSeeded,
        };
    }
    async restartPreview() {
        return this.e2b.restartPreview(this.sandboxId);
    }
    async ensurePreviewRunning() {
        return this.e2b.ensurePreviewRunning(this.sandboxId);
    }
    async recordPackageJsonHash() {
        return this.e2b.recordPackageJsonHash(this.sandboxId);
    }
    async isPreviewHealthy() {
        try {
            const result = await this.runCommand("curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/", WORKSPACE_ROOT, { timeoutMs: 5_000 });
            return result.success && result.stdout.trim() === '200';
        }
        catch {
            return false;
        }
    }
    async installPackage(packageName) {
        return this.runCommand(`npm install ${(0, shell_1.shellQuote)(packageName)}`);
    }
    toRelativePath(inputPath) {
        if (inputPath.startsWith(WORKSPACE_ROOT)) {
            return inputPath.slice(WORKSPACE_ROOT.length + 1);
        }
        if (inputPath.startsWith('/')) {
            return inputPath.slice(1);
        }
        return inputPath;
    }
    toAbsolutePath(inputPath) {
        if (inputPath.startsWith(WORKSPACE_ROOT)) {
            return inputPath;
        }
        if (inputPath.startsWith('/')) {
            return `${WORKSPACE_ROOT}${inputPath}`;
        }
        return `${WORKSPACE_ROOT}/${inputPath}`;
    }
}
exports.SandboxProvider = SandboxProvider;
//# sourceMappingURL=sandbox-provider.js.map