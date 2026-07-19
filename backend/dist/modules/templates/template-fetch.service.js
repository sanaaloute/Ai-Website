"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var TemplateFetchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateFetchService = void 0;
exports.extractTemplateFromZip = extractTemplateFromZip;
const common_1 = require("@nestjs/common");
const jszip_1 = __importDefault(require("jszip"));
const env_1 = require("../../config/env");
const GITHUB_API = 'https://api.github.com';
function timeoutSignal(ms) {
    return AbortSignal.timeout(ms);
}
const METADATA_FILES = new Set(['template.json']);
async function extractTemplateFromZip(buffer, templatePath) {
    const zip = await jszip_1.default.loadAsync(buffer);
    const prefix = `${templatePath}/`;
    const files = {};
    for (const [name, entry] of Object.entries(zip.files)) {
        if (entry.dir)
            continue;
        const firstSlash = name.indexOf('/');
        if (firstSlash === -1)
            continue;
        const repoRel = name.slice(firstSlash + 1);
        if (!repoRel.startsWith(prefix))
            continue;
        const rel = repoRel.slice(prefix.length);
        if (!rel || rel.split('/').some((seg) => seg === '..' || seg === ''))
            continue;
        if (METADATA_FILES.has(rel.slice(rel.lastIndexOf('/') + 1)))
            continue;
        files[rel] = await entry.async('string');
    }
    if (Object.keys(files).length === 0) {
        throw new Error(`No files found under "${templatePath}" in the repository archive`);
    }
    return files;
}
let TemplateFetchService = TemplateFetchService_1 = class TemplateFetchService {
    constructor() {
        this.logger = new common_1.Logger(TemplateFetchService_1.name);
    }
    get configured() {
        try {
            return !!(0, env_1.env)().templateRepo;
        }
        catch {
            return false;
        }
    }
    async fetchTemplate(templatePath) {
        const e = (0, env_1.env)();
        if (!e.templateRepo) {
            throw new Error('TEMPLATE_REPO is not configured (expected "owner/repo")');
        }
        const [owner, repo] = e.templateRepo.split('/');
        if (!owner || !repo) {
            throw new Error(`Invalid TEMPLATE_REPO "${e.templateRepo}" (expected "owner/repo")`);
        }
        return this.fetchTemplateFiles({
            owner,
            repo,
            ref: e.templateRepoRef,
            templatePath,
            token: e.githubToken,
        });
    }
    async fetchTemplateFiles(opts) {
        const { owner, repo, ref = 'main', token } = opts;
        const templatePath = opts.templatePath.replace(/^\/+|\/+$/g, '');
        if (!templatePath ||
            templatePath.split('/').some((seg) => seg === '..' || seg === '.' || seg === '')) {
            throw new Error(`Invalid template path: ${opts.templatePath}`);
        }
        const url = `${GITHUB_API}/repos/${owner}/${repo}/zipball/${encodeURIComponent(ref)}`;
        const headers = {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'ai-website-backend',
        };
        if (token)
            headers.Authorization = `Bearer ${token}`;
        this.logger.log(`Fetching template "${templatePath}" from ${owner}/${repo}@${ref}`);
        const res = await fetch(url, { headers, signal: timeoutSignal(60_000), redirect: 'follow' });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`GitHub archive request failed: ${res.status} ${res.statusText} ${body.slice(0, 200)}`);
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        const files = await extractTemplateFromZip(buffer, templatePath);
        this.logger.log(`Fetched ${Object.keys(files).length} files for template "${templatePath}" from GitHub`);
        return files;
    }
};
exports.TemplateFetchService = TemplateFetchService;
exports.TemplateFetchService = TemplateFetchService = TemplateFetchService_1 = __decorate([
    (0, common_1.Injectable)()
], TemplateFetchService);
//# sourceMappingURL=template-fetch.service.js.map