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
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("./supabase.service");
const BUCKET = 'project-files';
function chunk(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}
let StorageService = StorageService_1 = class StorageService {
    constructor(supabase) {
        this.supabase = supabase;
        this.logger = new common_1.Logger(StorageService_1.name);
        this.bucketEnsured = false;
    }
    async onModuleInit() {
        await this.ensureBucket();
    }
    path(userId, projectId, name) {
        return `${userId}/projects/${projectId}/${name}`;
    }
    async ensureBucket() {
        if (this.bucketEnsured)
            return;
        try {
            const { data: buckets, error: listError } = await this.supabase.admin.storage.listBuckets();
            if (listError) {
                this.logger.error(`ensureBucket listBuckets error: ${listError.message}`);
                return;
            }
            if (!buckets?.find((b) => b.name === BUCKET)) {
                const { error } = await this.supabase.admin.storage.createBucket(BUCKET, { public: false });
                if (error) {
                    this.logger.error(`ensureBucket createBucket error: ${error.message}`);
                    return;
                }
                this.logger.log(`Created storage bucket: ${BUCKET}`);
            }
            else {
                this.logger.log(`Storage bucket already exists: ${BUCKET}`);
            }
            this.bucketEnsured = true;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`ensureBucket unexpected error: ${msg}`);
        }
    }
    async uploadLatest(userId, projectId, payload) {
        await this.ensureBucket();
        const path = this.path(userId, projectId, 'latest.json');
        const { error } = await this.supabase.admin.storage
            .from(BUCKET)
            .upload(path, JSON.stringify(payload), { contentType: 'application/json', upsert: true });
        if (error) {
            this.logger.error(`uploadLatest error: ${error.message}`);
            return null;
        }
        return path;
    }
    async downloadLatest(userId, projectId) {
        const path = this.path(userId, projectId, 'latest.json');
        const { data, error } = await this.supabase.admin.storage.from(BUCKET).download(path);
        if (error || !data)
            return null;
        try {
            return JSON.parse(await data.text());
        }
        catch {
            return null;
        }
    }
    async uploadFile(userId, projectId, relativePath, content) {
        await this.ensureBucket();
        const path = `${this.path(userId, projectId, 'files')}/${relativePath}`;
        const { error } = await this.supabase.admin.storage
            .from(BUCKET)
            .upload(path, content, { contentType: 'text/plain', upsert: true });
        if (error) {
            this.logger.error(`uploadFile error: ${error.message}`);
            return null;
        }
        return path;
    }
    async downloadFile(userId, projectId, relativePath) {
        const path = `${this.path(userId, projectId, 'files')}/${relativePath}`;
        const { data, error } = await this.supabase.admin.storage.from(BUCKET).download(path);
        if (error || !data)
            return null;
        return data.text();
    }
    async uploadZip(userId, projectId, zipBuffer) {
        await this.ensureBucket();
        const path = this.path(userId, projectId, 'project.zip');
        const { error } = await this.supabase.admin.storage
            .from(BUCKET)
            .upload(path, zipBuffer, { contentType: 'application/zip', upsert: true });
        if (error) {
            this.logger.error(`uploadZip error: ${error.message}`);
            return null;
        }
        return path;
    }
    async getSignedZipUrl(userId, projectId, expiresIn = 600) {
        const path = this.path(userId, projectId, 'project.zip');
        const { data, error } = await this.supabase.admin.storage.from(BUCKET).createSignedUrl(path, expiresIn);
        if (error) {
            this.logger.error(`getSignedZipUrl error: ${error.message}`);
            return null;
        }
        return data?.signedUrl ?? null;
    }
    async listFiles(userId, projectId) {
        const prefix = `${userId}/projects/${projectId}/files/`;
        const { data, error } = await this.supabase.admin.storage.from(BUCKET).list(prefix);
        if (error) {
            this.logger.error(`listFiles error: ${error.message}`);
            return [];
        }
        return (data ?? []).map((item) => item.name);
    }
    async deleteProjectFiles(userId, projectId) {
        const prefix = `${userId}/projects/${projectId}/`;
        await this.deletePrefix(prefix);
    }
    async deleteUserFiles(userId) {
        const prefix = `${userId}/`;
        await this.deletePrefix(prefix);
    }
    async deletePrefix(prefix) {
        await this.ensureBucket();
        const paths = [];
        let cursor;
        try {
            do {
                const { data, error } = await this.supabase.admin.storage.from(BUCKET).listV2({
                    prefix,
                    limit: 1000,
                    with_delimiter: false,
                    cursor,
                });
                if (error) {
                    this.logger.error(`deletePrefix listV2 error: ${error.message}`);
                    return;
                }
                for (const obj of data?.objects ?? []) {
                    if (obj.key) {
                        paths.push(obj.key);
                    }
                    else if (obj.name) {
                        const fallback = obj.name.startsWith(prefix) ? obj.name : `${prefix}${obj.name}`;
                        paths.push(fallback);
                    }
                }
                cursor = data?.nextCursor;
            } while (cursor);
            if (!paths.length)
                return;
            for (const batch of chunk(paths, 100)) {
                const { error } = await this.supabase.admin.storage.from(BUCKET).remove(batch);
                if (error)
                    this.logger.error(`deletePrefix remove error: ${error.message}`);
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`deletePrefix unexpected error: ${msg}`);
        }
    }
    async snapshotPath(userId, projectId) {
        return this.path(userId, projectId, 'latest.json');
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], StorageService);
//# sourceMappingURL=storage.service.js.map