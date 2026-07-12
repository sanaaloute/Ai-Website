"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SandboxController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxController = void 0;
const common_1 = require("@nestjs/common");
const optional_auth_guard_1 = require("../../common/guards/optional-auth.guard");
const auth_guard_1 = require("../../common/guards/auth.guard");
const user_decorator_1 = require("../../common/decorators/user.decorator");
const e2b_service_1 = require("../../lib/e2b.service");
const storage_service_1 = require("../../lib/storage.service");
const idempotency_service_1 = require("../../lib/idempotency.service");
const entitlements_service_1 = require("../billing/entitlements.service");
const WORKDIR = '/home/user/app';
function sseInit(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write('retry: 3000\n\n');
}
function sseWrite(res, payload) {
    if (res.writableEnded)
        return;
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    res.flush?.();
}
function sseDone(res) {
    if (!res.writableEnded) {
        res.write(`data: {"type":"done"}\n\n`);
        res.end();
    }
}
let SandboxController = SandboxController_1 = class SandboxController {
    constructor(e2b, storage, idempotency, entitlements) {
        this.e2b = e2b;
        this.storage = storage;
        this.idempotency = idempotency;
        this.entitlements = entitlements;
        this.logger = new common_1.Logger(SandboxController_1.name);
    }
    async createAiSandbox(user, body) {
        if (user?.id) {
            await this.entitlements.assertSandboxTimeAvailable(user.id);
        }
        return this.idempotency.process(body.idempotencyKey ?? '', async () => {
            const data = await this.e2b.createSandbox({ skipSetup: body.skipSetup, userId: user?.id });
            return { success: true, ...data };
        }, 3600);
    }
    async killSandbox(body) {
        if (!body.sandboxId)
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        const killed = await this.e2b.kill(body.sandboxId);
        return { success: true, sandboxKilled: killed };
    }
    async sandboxRenew(body) {
        if (!body.sandboxId)
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        try {
            const data = await this.e2b.renewSandbox(body.sandboxId);
            return {
                success: true,
                oldSandboxId: body.sandboxId,
                newSandboxId: data.sandboxId,
                url: data.url,
                createdAt: data.createdAt,
                endAt: data.endAt,
                filesMigrated: data.filesMigrated,
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`Sandbox renewal failed for ${body.sandboxId}: ${message}`);
            throw new common_1.HttpException({ success: false, error: `Renewal failed: ${message}`, oldSandboxId: body.sandboxId }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async sandboxStatus(sandboxId) {
        if (!sandboxId)
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        try {
            const data = await this.e2b.attach(sandboxId);
            return { success: true, active: true, healthy: true, sandboxData: data };
        }
        catch (err) {
            if (err instanceof e2b_service_1.SandboxNotFoundError || err instanceof e2b_service_1.SandboxGoneError || err instanceof e2b_service_1.E2BProviderError) {
                this.logger.warn(`Sandbox ${sandboxId} is unreachable: ${err.message}`);
                return {
                    success: true,
                    active: false,
                    healthy: false,
                    reason: err.message,
                    sandboxData: null,
                };
            }
            throw err;
        }
    }
    async sandboxLogs(sandboxId) {
        if (!sandboxId)
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        const framework = await this.e2b.detectFramework(sandboxId);
        const logFile = framework === 'next' ? '/tmp/next.log' : '/tmp/vite.log';
        const cmd = await this.e2b.runCommand(sandboxId, `tail -n 50 ${logFile} 2>/dev/null || echo "No logs yet"`);
        return { success: true, logs: cmd.output.split('\n'), status: cmd.exitCode === 0 ? 'running' : 'stopped' };
    }
    async getSandboxSnapshot(user, projectId, sandboxId) {
        if (!projectId || !sandboxId)
            throw new common_1.HttpException({ success: false, error: 'projectId and sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        const snapshot = await this.storage.downloadLatest(user.id, projectId);
        return {
            success: true,
            snapshot: snapshot ?? { projectId, sandboxId, fileStructure: '', sandboxFiles: {} },
        };
    }
    async saveSandboxSnapshot(user, body) {
        const projectId = body.projectId;
        if (!projectId)
            throw new common_1.HttpException({ success: false, error: 'projectId required' }, common_1.HttpStatus.BAD_REQUEST);
        const path = await this.storage.uploadLatest(user.id, projectId, body);
        return { success: true, snapshot: body, path };
    }
    async restartPreview(body) {
        if (!body.sandboxId)
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        const ok = await this.e2b.restartPreview(body.sandboxId);
        return { success: ok, message: ok ? 'Preview server restarted' : 'Failed to restart preview' };
    }
    async runCommand(body) {
        if (!body.sandboxId || !body.command) {
            throw new common_1.HttpException({ success: false, error: 'sandboxId and command required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const result = await this.e2b.runCommand(body.sandboxId, body.command);
        return {
            success: result.exitCode === 0,
            output: result.output,
            error: result.error,
            exitCode: result.exitCode,
            message: result.exitCode === 0 ? 'Command executed successfully' : 'Command failed',
        };
    }
    async getSandboxFile(sandboxId, filePath) {
        if (!sandboxId || !filePath) {
            throw new common_1.HttpException({ success: false, error: 'sandboxId and path required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const content = await this.e2b.readFile(sandboxId, filePath);
        return { success: true, path: filePath, content };
    }
    async writeSandboxFile(body) {
        if (!body.sandboxId || !body.path || body.content === undefined) {
            throw new common_1.HttpException({ success: false, error: 'sandboxId, path, and content required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const ok = await this.e2b.writeFile(body.sandboxId, body.path, body.content);
        return { success: ok, path: body.path };
    }
    async renameSandboxFile(body) {
        if (!body.sandboxId || !body.path || !body.newPath) {
            throw new common_1.HttpException({ success: false, error: 'sandboxId, path, and newPath required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const ok = await this.e2b.renameFile(body.sandboxId, body.path, body.newPath);
        return { success: ok, oldPath: body.path, newPath: body.newPath };
    }
    async deleteSandboxFile(sandboxId, filePath) {
        if (!sandboxId || !filePath) {
            throw new common_1.HttpException({ success: false, error: 'sandboxId and path required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const ok = await this.e2b.deleteFile(sandboxId, filePath);
        return { success: ok, path: filePath };
    }
    async installPackages(body, res) {
        if (!body.sandboxId)
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        const packages = body.packages ?? [];
        sseInit(res);
        res.req.on('close', () => {
            if (!res.writableEnded)
                res.end();
        });
        const packagesInstalled = [];
        const packagesFailed = [];
        try {
            sseWrite(res, { type: 'start', packages });
            sseWrite(res, { type: 'status', message: `Installing ${packages.length} packages...` });
            if (packages.length) {
                const command = `npm install ${packages.join(' ')}`;
                sseWrite(res, { type: 'command', command });
                const stdoutChunks = [];
                const stderrChunks = [];
                const result = await this.e2b.runCommand(body.sandboxId, command, WORKDIR, {
                    timeoutMs: 10 * 60 * 1000,
                    onStdout: (data) => {
                        stdoutChunks.push(data);
                        sseWrite(res, { type: 'command-output', output: data, stream: 'stdout' });
                        const resolvedPackage = data.match(/^(?:\+|--\s)(@?[^\s@]+@[^\s]+)/)?.[1];
                        if (resolvedPackage && !packagesInstalled.includes(resolvedPackage)) {
                            packagesInstalled.push(resolvedPackage);
                            sseWrite(res, { type: 'package-progress', installedPackages: [...packagesInstalled] });
                        }
                    },
                    onStderr: (data) => {
                        stderrChunks.push(data);
                        sseWrite(res, { type: 'command-output', output: data, stream: 'stderr' });
                    },
                });
                sseWrite(res, { type: 'command-complete', success: result.exitCode === 0, exitCode: result.exitCode });
                if (result.exitCode === 0) {
                    if (packagesInstalled.length === 0) {
                        packagesInstalled.push(...packages);
                    }
                    for (const pkg of packages) {
                        sseWrite(res, { type: 'success', package: pkg, exitCode: result.exitCode });
                    }
                    sseWrite(res, { type: 'package-progress', installedPackages: [...packagesInstalled] });
                }
                else {
                    for (const pkg of packages) {
                        packagesFailed.push(pkg);
                        sseWrite(res, { type: 'error', package: pkg, message: stderrChunks.join('\n') || `npm install failed with exit code ${result.exitCode}` });
                    }
                }
            }
            sseWrite(res, {
                type: 'complete',
                results: {
                    packagesInstalled,
                    packagesFailed,
                },
                appliedFiles: [],
                analyzerDone: true,
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            for (const pkg of packages) {
                packagesFailed.push(pkg);
            }
            sseWrite(res, { type: 'error', message });
            sseWrite(res, {
                type: 'complete',
                results: {
                    packagesInstalled,
                    packagesFailed,
                },
                appliedFiles: [],
                analyzerDone: true,
                error: message,
            });
        }
        finally {
            sseDone(res);
        }
    }
    async getSandboxFiles(sandboxId, maxFiles) {
        if (!sandboxId)
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        const parsedMax = maxFiles === undefined ? undefined : maxFiles === 'null' ? null : parseInt(maxFiles, 10);
        const data = await this.e2b.readFiles(sandboxId, { maxFiles: parsedMax });
        return { success: true, ...data };
    }
    async getSandboxFilesBinary(sandboxId) {
        if (!sandboxId)
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        const data = await this.e2b.readFiles(sandboxId);
        const encoded = {};
        for (const [path, content] of Object.entries(data.files)) {
            encoded[path] = Buffer.from(content).toString('base64');
        }
        return { success: true, files: encoded, fileCount: Object.keys(encoded).length };
    }
    async getSandboxPocketbaseInfo(sandboxId) {
        if (!sandboxId)
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        const info = await this.e2b.getPocketbaseInfo(sandboxId);
        if (!info) {
            return {
                success: true,
                url: null,
                adminEmail: null,
                adminPassword: null,
                message: 'PocketBase is not running in this sandbox',
            };
        }
        return {
            success: true,
            url: info.url,
            adminUrl: `${info.url}/_/`,
            adminEmail: info.adminEmail,
            adminPassword: info.adminPassword,
        };
    }
    async previewHealth(body) {
        if (!body.sandboxId)
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        const previewUrl = body.previewUrl ?? (await this.e2b.getPreviewUrl(body.sandboxId));
        const health = await this.e2b.previewHealth(previewUrl);
        return {
            success: true,
            active: health.reachable,
            reachable: health.reachable,
            sandboxId: body.sandboxId,
            previewUrl: body.previewUrl,
            statusCode: health.statusCode ?? 0,
            diagnostics: {},
            reason: null,
        };
    }
    async monitorPreviewLogs(sandboxId) {
        if (!sandboxId)
            throw new common_1.HttpException({ success: false, error: 'sandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        const cmd = await this.e2b.runCommand(sandboxId, 'cat /tmp/next.log /tmp/vite.log 2>/dev/null || echo ""');
        const errors = [];
        const missing = cmd.output.match(/Cannot find module '([^']+)'/g);
        if (missing) {
            for (const m of missing) {
                const pkg = m.match(/'([^']+)'/)?.[1] ?? '';
                errors.push({ type: 'missing_import', package: pkg, message: `Cannot find module '${pkg}'`, file: '' });
            }
        }
        return { success: true, hasErrors: errors.length > 0, errors };
    }
    reportPreviewError(body) {
        this.logger.warn(`Preview error [${body.sandboxId}]: ${body.type} - ${body.error} (${body.file})`);
        return {
            success: true,
            error: { type: body.type ?? 'unknown', message: body.error ?? '', file: body.file ?? '', timestamp: new Date().toISOString() },
        };
    }
    checkPreviewErrors() {
        return { success: true, hasErrors: false, errors: [], storage: 'none' };
    }
    async previewInlineText(body) {
        if (!body.sandboxId || !body.relativePath) {
            throw new common_1.HttpException({ success: false, error: 'sandboxId and relativePath required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const files = await this.e2b.readFiles(body.sandboxId);
        let content = files.files[body.relativePath] ?? '';
        if (body.oldText && body.newText !== undefined) {
            content = content.replace(body.oldText, body.newText);
            await this.e2b.writeFile(body.sandboxId, body.relativePath, content);
        }
        return { success: true, path: body.relativePath };
    }
    async getSandboxFileLegacy(sandboxId, path) {
        if (!sandboxId || !path) {
            throw new common_1.HttpException({ success: false, error: 'sandboxId and path required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const content = await this.e2b.readFile(sandboxId, path);
        if (content === null) {
            throw new common_1.HttpException({ success: false, error: 'File not found' }, common_1.HttpStatus.NOT_FOUND);
        }
        return { success: true, path, content };
    }
    async restoreSandboxSnapshot(body) {
        if (!body.sandboxId || !body.snapshotId) {
            throw new common_1.HttpException({ success: false, error: 'sandboxId and snapshotId required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const restored = await this.e2b.restoreSandboxSnapshot(body.sandboxId, body.snapshotId);
        return { success: restored };
    }
};
exports.SandboxController = SandboxController;
__decorate([
    (0, common_1.Post)('create-ai-sandbox-v2'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "createAiSandbox", null);
__decorate([
    (0, common_1.Post)('kill-sandbox'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "killSandbox", null);
__decorate([
    (0, common_1.Post)('sandbox-renew'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "sandboxRenew", null);
__decorate([
    (0, common_1.Get)('sandbox-status'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Query)('sandboxId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "sandboxStatus", null);
__decorate([
    (0, common_1.Get)('sandbox-logs'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Query)('sandboxId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "sandboxLogs", null);
__decorate([
    (0, common_1.Get)('sandbox-snapshot'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('projectId')),
    __param(2, (0, common_1.Query)('sandboxId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "getSandboxSnapshot", null);
__decorate([
    (0, common_1.Post)('sandbox-snapshot'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "saveSandboxSnapshot", null);
__decorate([
    (0, common_1.Post)('restart-preview'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "restartPreview", null);
__decorate([
    (0, common_1.Post)('run-command-v2'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "runCommand", null);
__decorate([
    (0, common_1.Get)('sandbox-file'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Query)('sandboxId')),
    __param(1, (0, common_1.Query)('path')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "getSandboxFile", null);
__decorate([
    (0, common_1.Post)('sandbox-file'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "writeSandboxFile", null);
__decorate([
    (0, common_1.Patch)('sandbox-file'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "renameSandboxFile", null);
__decorate([
    (0, common_1.Delete)('sandbox-file'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Query)('sandboxId')),
    __param(1, (0, common_1.Query)('path')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "deleteSandboxFile", null);
__decorate([
    (0, common_1.Post)('install-packages-v2'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "installPackages", null);
__decorate([
    (0, common_1.Get)('get-sandbox-files'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Query)('sandboxId')),
    __param(1, (0, common_1.Query)('maxFiles')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "getSandboxFiles", null);
__decorate([
    (0, common_1.Get)('get-sandbox-files-binary'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Query)('sandboxId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "getSandboxFilesBinary", null);
__decorate([
    (0, common_1.Get)('get-sandbox-pocketbase-info'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Query)('sandboxId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "getSandboxPocketbaseInfo", null);
__decorate([
    (0, common_1.Post)('preview-health'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "previewHealth", null);
__decorate([
    (0, common_1.Get)('monitor-preview-logs'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Query)('sandboxId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "monitorPreviewLogs", null);
__decorate([
    (0, common_1.Post)('report-preview-error'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SandboxController.prototype, "reportPreviewError", null);
__decorate([
    (0, common_1.Get)('check-preview-errors'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SandboxController.prototype, "checkPreviewErrors", null);
__decorate([
    (0, common_1.Post)('preview-inline-text'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "previewInlineText", null);
__decorate([
    (0, common_1.Get)('get-sandbox-file'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Query)('sandboxId')),
    __param(1, (0, common_1.Query)('path')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "getSandboxFileLegacy", null);
__decorate([
    (0, common_1.Post)('sandbox-snapshot/restore'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SandboxController.prototype, "restoreSandboxSnapshot", null);
exports.SandboxController = SandboxController = SandboxController_1 = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [e2b_service_1.E2BService,
        storage_service_1.StorageService,
        idempotency_service_1.IdempotencyService,
        entitlements_service_1.EntitlementsService])
], SandboxController);
//# sourceMappingURL=sandbox.controller.js.map