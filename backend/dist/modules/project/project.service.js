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
var ProjectService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const common_1 = require("@nestjs/common");
const storage_service_1 = require("../../lib/storage.service");
let ProjectService = ProjectService_1 = class ProjectService {
    constructor(storage) {
        this.storage = storage;
        this.logger = new common_1.Logger(ProjectService_1.name);
    }
    async upsertLovecodeJson(userId, projectId, options = {}) {
        const snapshot = options.snapshot ?? (await this.storage.downloadLatest(userId, projectId));
        const sandboxFiles = snapshot?.sandboxFiles ?? {};
        let existing;
        try {
            const raw = sandboxFiles['lovecode.json'];
            if (raw) {
                existing = JSON.parse(raw);
            }
        }
        catch {
        }
        const projectUuid = options?.project?.uuid || existing?.project?.uuid || projectId;
        const existingName = existing?.project?.name?.trim();
        const providedName = options?.project?.name?.trim();
        const providedSiteTitle = options?.project?.siteTitle?.trim();
        const projectName = providedName ||
            (existingName && existingName !== projectId ? existingName : undefined) ||
            'Untitled Project';
        const siteTitle = providedSiteTitle ||
            existing?.project?.siteTitle?.trim() ||
            projectName;
        const mergedDeployment = {
            platform: 'vercel',
            note: 'Deployment info is stored in LoveCode cloud after first deploy',
            ...existing?.deployment,
            ...options?.deployment,
        };
        const lovecode = {
            project: {
                uuid: projectUuid,
                name: projectName,
                siteTitle,
            },
            deployment: mergedDeployment,
        };
        const content = JSON.stringify(lovecode, null, 2);
        const updatedSnapshot = {
            ...snapshot,
            sandboxFiles: {
                ...sandboxFiles,
                'lovecode.json': content,
            },
        };
        const [latestPath, filePath] = await Promise.all([
            this.storage.uploadLatest(userId, projectId, updatedSnapshot),
            this.storage.uploadFile(userId, projectId, 'lovecode.json', content),
        ]);
        if (!latestPath || !filePath) {
            this.logger.warn(`Failed to persist lovecode.json for project ${projectId}: latest=${latestPath}, file=${filePath}`);
            return null;
        }
        return { content, snapshot: updatedSnapshot };
    }
    async readLovecodeJson(userId, projectId) {
        try {
            const snapshot = await this.storage.downloadLatest(userId, projectId);
            const sandboxFiles = snapshot?.sandboxFiles ?? {};
            const raw = sandboxFiles['lovecode.json'];
            if (!raw)
                return null;
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    }
};
exports.ProjectService = ProjectService;
exports.ProjectService = ProjectService = ProjectService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [storage_service_1.StorageService])
], ProjectService);
//# sourceMappingURL=project.service.js.map