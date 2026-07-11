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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ProjectController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/guards/auth.guard");
const optional_auth_guard_1 = require("../../common/guards/optional-auth.guard");
const user_decorator_1 = require("../../common/decorators/user.decorator");
const storage_service_1 = require("../../lib/storage.service");
const idempotency_service_1 = require("../../lib/idempotency.service");
const supabase_service_1 = require("../../lib/supabase.service");
const e2b_service_1 = require("../../lib/e2b.service");
const project_service_1 = require("./project.service");
const env_1 = require("../../config/env");
const jszip_1 = __importDefault(require("jszip"));
let ProjectController = ProjectController_1 = class ProjectController {
    constructor(storage, supabase, e2b, idempotency, projectService) {
        this.storage = storage;
        this.supabase = supabase;
        this.e2b = e2b;
        this.idempotency = idempotency;
        this.projectService = projectService;
        this.logger = new common_1.Logger(ProjectController_1.name);
    }
    async listProjects(user) {
        const { data, error } = await this.supabase.admin
            .from('projects')
            .select('id, name, updated_at, vercel_project_id, vercel_domain_url, vercel_deployed_at, github_repo_url')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });
        if (error)
            throw new common_1.HttpException({ success: false, error: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        const projects = (data ?? []).map((p) => ({
            projectId: p.id,
            projectName: p.name,
            updatedAt: new Date(p.updated_at).getTime(),
            preview: null,
            vercelProjectId: p.vercel_project_id,
            vercelDomainUrl: p.vercel_domain_url,
            vercelDeployedAt: p.vercel_deployed_at,
            githubRepoUrl: p.github_repo_url,
        }));
        return { success: true, projects };
    }
    async deleteProject(user, body) {
        if (!body.projectId)
            throw new common_1.HttpException({ success: false, error: 'projectId required' }, common_1.HttpStatus.BAD_REQUEST);
        await this.storage.deleteProjectFiles(user.id, body.projectId);
        const { error } = await this.supabase.admin.from('projects').delete().eq('id', body.projectId).eq('user_id', user.id);
        if (error)
            throw new common_1.HttpException({ success: false, error: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        return { success: true, projectId: body.projectId };
    }
    async renameProject(user, body) {
        if (!body.projectId || !body.projectName?.trim()) {
            throw new common_1.HttpException({ success: false, error: 'projectId and projectName required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const trimmedName = body.projectName.trim();
        const { error } = await this.supabase.admin
            .from('projects')
            .update({ name: trimmedName, updated_at: new Date().toISOString() })
            .eq('id', body.projectId)
            .eq('user_id', user.id);
        if (error)
            throw new common_1.HttpException({ success: false, error: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        const lovecodeResult = await this.projectService.upsertLovecodeJson(user.id, body.projectId, {
            project: { name: trimmedName },
        });
        if (!lovecodeResult) {
            throw new common_1.HttpException({ success: false, error: 'Failed to update lovecode.json during rename' }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return { success: true, projectId: body.projectId, projectName: trimmedName };
    }
    async saveProject(user, body) {
        const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
        return this.idempotency.process(idempotencyKey, async () => {
            return this.doSaveProject(user, body);
        }, 86400);
    }
    async doSaveProject(user, body) {
        const projectId = body.projectId ?? crypto.randomUUID();
        const rawProjectName = body.projectName ?? '';
        const projectName = rawProjectName.trim();
        const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
        if (!projectName || projectName === projectId || isUuid(projectName)) {
            throw new common_1.HttpException({ success: false, error: 'A valid project name is required.' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const { data: existing } = await this.supabase.admin.from('projects').select('id').eq('id', projectId).single();
        if (existing) {
            await this.supabase.admin
                .from('projects')
                .update({ name: projectName, updated_at: new Date().toISOString() })
                .eq('id', projectId);
        }
        else {
            await this.supabase.admin.from('projects').insert({
                id: projectId,
                user_id: user.id,
                name: projectName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }
        let sandboxFiles = body.sandboxFiles ?? {};
        const sandboxId = body.sandboxId ?? '';
        if (sandboxId) {
            try {
                const fromSandbox = await this.e2b.readFiles(sandboxId, {
                    maxFiles: null,
                    excludePrefixes: ['node_modules/'],
                });
                sandboxFiles = { ...sandboxFiles, ...fromSandbox.files };
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                this.logger.warn(`Could not read files from sandbox ${sandboxId} during save: ${message}`);
            }
        }
        const lovecodeResult = await this.projectService.upsertLovecodeJson(user.id, projectId, {
            project: {
                uuid: projectId,
                name: projectName,
                siteTitle: body.siteTitle || projectName,
            },
            snapshot: { ...body, sandboxFiles },
        });
        const updatedSnapshot = lovecodeResult?.snapshot ?? { ...body, sandboxFiles };
        const lovecodeContent = lovecodeResult?.content;
        const forbiddenPrefixes = ['node_modules/'];
        const filteredFiles = {};
        const filesToUpload = updatedSnapshot.sandboxFiles ?? sandboxFiles;
        for (const [path, content] of Object.entries(filesToUpload)) {
            if (forbiddenPrefixes.some((prefix) => path.startsWith(prefix)))
                continue;
            filteredFiles[path] = content;
        }
        if (lovecodeContent) {
            filteredFiles['lovecode.json'] = lovecodeContent;
        }
        let uploaded = 0;
        for (const [path, content] of Object.entries(filteredFiles)) {
            const ok = await this.storage.uploadFile(user.id, projectId, path, content);
            if (ok)
                uploaded++;
        }
        const zip = new jszip_1.default();
        for (const [path, content] of Object.entries(filteredFiles)) {
            zip.file(path, content);
        }
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        const zipPath = (await this.storage.snapshotPath(user.id, projectId)).replace('latest.json', 'project.zip');
        await this.storage.uploadZip(user.id, projectId, zipBuffer);
        return {
            success: true,
            projectId,
            projectName,
            savedFiles: Object.keys(filteredFiles).length,
            storageFilesUploaded: uploaded,
            zipPath,
            zipUploaded: true,
            dbSynced: true,
            warnings: [],
        };
    }
    async openProject(user, body) {
        if (!body.projectId || !body.targetSandboxId) {
            throw new common_1.HttpException({ success: false, error: 'projectId and targetSandboxId required' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const snapshot = await this.storage.downloadLatest(user.id, body.projectId);
        if (!snapshot) {
            throw new common_1.HttpException({ success: false, error: 'Project snapshot not found in storage. Save the project first.' }, common_1.HttpStatus.NOT_FOUND);
        }
        const sandboxFiles = snapshot?.sandboxFiles ?? {};
        const forbiddenPrefixes = ['node_modules/'];
        let restored = 0;
        for (const [path, content] of Object.entries(sandboxFiles)) {
            if (forbiddenPrefixes.some((prefix) => path.startsWith(prefix)))
                continue;
            const ok = await this.e2b.writeFile(body.targetSandboxId, path, content);
            if (ok)
                restored++;
        }
        const warnings = [];
        const restoredPaths = Object.keys(sandboxFiles);
        const hasPackageJson = restoredPaths.includes('package.json');
        if (restoredPaths.length > 0 && restored === 0) {
            warnings.push('No project files could be restored. The saved snapshot may be empty or the storage bucket was missing when the project was saved.');
        }
        if (hasPackageJson) {
            const installRes = await this.e2b.runCommand(body.targetSandboxId, 'npm install', e2b_service_1.WORKDIR, { timeoutMs: 5 * 60 * 1000 });
            if (installRes.exitCode !== 0) {
                warnings.push(`npm install failed after restore: ${installRes.error || installRes.output}`);
            }
        }
        else {
            warnings.push('Restored project is missing package.json; preview server may not start.');
        }
        const previewStarted = await this.e2b.restartPreview(body.targetSandboxId);
        if (!previewStarted) {
            warnings.push('Preview server failed to start after restore.');
        }
        return {
            success: true,
            restoreSource: 'storage',
            restoredCount: restored,
            sandboxData: await this.e2b.attach(body.targetSandboxId),
            warnings,
            snapshot,
        };
    }
    async restoreLocal(body) {
        return {
            success: true,
            projectId: body.projectId,
            sandboxId: body.sandboxId,
            restoredCount: 0,
            totalFiles: 0,
            errors: ['Local SQLite fallback not supported in this backend'],
        };
    }
    async createZip(user, body) {
        if (!body.projectId)
            throw new common_1.HttpException({ success: false, error: 'projectId required' }, common_1.HttpStatus.BAD_REQUEST);
        const signedUrl = await this.storage.getSignedZipUrl(user.id, body.projectId);
        return {
            success: true,
            downloadUrl: signedUrl ?? `${(0, env_1.env)().appUrl}/api/create-zip?projectId=${body.projectId}`,
            fileName: `${body.projectName ?? 'project'}.zip`,
            message: 'ZIP created successfully',
        };
    }
    async downloadRepo(repoUrl, res) {
        if (!repoUrl)
            throw new common_1.HttpException({ success: false, error: 'repo_url required' }, common_1.HttpStatus.BAD_REQUEST);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=repo.zip');
        res.send(Buffer.from(`stub zip for ${repoUrl}`));
    }
};
exports.ProjectController = ProjectController;
__decorate([
    (0, common_1.Get)('projects'),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProjectController.prototype, "listProjects", null);
__decorate([
    (0, common_1.Delete)('projects'),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectController.prototype, "deleteProject", null);
__decorate([
    (0, common_1.Patch)('projects'),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectController.prototype, "renameProject", null);
__decorate([
    (0, common_1.Post)('projects/save'),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectController.prototype, "saveProject", null);
__decorate([
    (0, common_1.Post)('projects/open'),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectController.prototype, "openProject", null);
__decorate([
    (0, common_1.Post)('projects/restore-local'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProjectController.prototype, "restoreLocal", null);
__decorate([
    (0, common_1.Post)('create-zip'),
    __param(0, (0, user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ProjectController.prototype, "createZip", null);
__decorate([
    (0, common_1.Get)('download-repo'),
    (0, common_1.UseGuards)(optional_auth_guard_1.OptionalAuthGuard),
    __param(0, (0, common_1.Query)('repo_url')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectController.prototype, "downloadRepo", null);
exports.ProjectController = ProjectController = ProjectController_1 = __decorate([
    (0, common_1.Controller)('api'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:paramtypes", [storage_service_1.StorageService,
        supabase_service_1.SupabaseService,
        e2b_service_1.E2BService,
        idempotency_service_1.IdempotencyService,
        project_service_1.ProjectService])
], ProjectController);
//# sourceMappingURL=project.controller.js.map