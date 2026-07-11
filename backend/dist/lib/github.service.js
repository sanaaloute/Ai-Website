"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GithubService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubService = void 0;
const common_1 = require("@nestjs/common");
const env_1 = require("../config/env");
const GITHUB_API = 'https://api.github.com';
const GITHUB_OAUTH = 'https://github.com/login/oauth';
function timeoutSignal(ms) {
    return AbortSignal.timeout(ms);
}
let GithubService = GithubService_1 = class GithubService {
    constructor() {
        this.logger = new common_1.Logger(GithubService_1.name);
    }
    get configured() {
        const e = (0, env_1.env)();
        return !!(e.githubClientId && e.githubClientSecret);
    }
    authorizeUrl(state, next) {
        const e = (0, env_1.env)();
        const params = new URLSearchParams({
            client_id: e.githubClientId,
            redirect_uri: e.githubRedirectUri,
            state,
            scope: 'repo read:user',
        });
        if (next)
            params.set('next', next);
        return `${GITHUB_OAUTH}/authorize?${params.toString()}`;
    }
    async exchangeCode(code) {
        if (!this.configured) {
            return {
                access_token: `stub-token-${Date.now()}`,
                refresh_token: `stub-refresh-${Date.now()}`,
            };
        }
        const e = (0, env_1.env)();
        try {
            const res = await fetch(`${GITHUB_OAUTH}/access_token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                signal: timeoutSignal(15_000),
                body: JSON.stringify({
                    client_id: e.githubClientId,
                    client_secret: e.githubClientSecret,
                    code,
                    redirect_uri: e.githubRedirectUri,
                }),
            });
            if (!res.ok) {
                const body = await res.text();
                this.logger.warn(`GitHub token exchange failed: ${res.status} ${body}`);
                return null;
            }
            const data = (await res.json());
            if (data.error || !data.access_token) {
                this.logger.warn(`GitHub token exchange returned error: ${data.error ?? 'no access_token'}`);
                return null;
            }
            return data;
        }
        catch (err) {
            this.logger.error(`exchangeCode error: ${err instanceof Error ? err.message : String(err)}`);
            return null;
        }
    }
    async refreshAccessToken(refreshToken) {
        if (!this.configured) {
            return { access_token: `stub-token-${Date.now()}`, refresh_token: refreshToken };
        }
        const e = (0, env_1.env)();
        try {
            const res = await fetch(`${GITHUB_OAUTH}/access_token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                signal: timeoutSignal(15_000),
                body: JSON.stringify({
                    client_id: e.githubClientId,
                    client_secret: e.githubClientSecret,
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token',
                }),
            });
            if (!res.ok) {
                const body = await res.text();
                this.logger.warn(`GitHub token refresh failed: ${res.status} ${body}`);
                return null;
            }
            const data = (await res.json());
            if (data.error || !data.access_token)
                return null;
            return data;
        }
        catch (err) {
            this.logger.error(`refreshAccessToken error: ${err instanceof Error ? err.message : String(err)}`);
            return null;
        }
    }
    async ensureValidToken(accessToken, refreshToken) {
        const headers = this.authHeaders(accessToken);
        const userRes = await fetch(`${GITHUB_API}/user`, { headers, signal: timeoutSignal(15_000) });
        if (userRes.ok) {
            return { accessToken, refreshToken };
        }
        if (userRes.status === 401 && refreshToken) {
            const refreshed = await this.refreshAccessToken(refreshToken);
            if (refreshed) {
                return {
                    accessToken: refreshed.access_token,
                    refreshToken: refreshed.refresh_token ?? refreshToken,
                };
            }
        }
        return null;
    }
    async push(accessToken, repoName, files, refreshToken) {
        const requestId = `req-${Date.now()}`;
        if (!this.configured) {
            return {
                ok: true,
                repoUrl: `https://github.com/user/${repoName}`,
                uploaded: files.length,
                requestId,
            };
        }
        const auth = await this.ensureValidToken(accessToken, refreshToken);
        if (!auth) {
            return {
                ok: false,
                repoUrl: '',
                uploaded: 0,
                requestId,
                error: 'GitHub session expired. Please reconnect your GitHub account.',
            };
        }
        const headers = this.authHeaders(auth.accessToken);
        const safeName = this.sanitizeRepoName(repoName);
        try {
            const userRes = await fetch(`${GITHUB_API}/user`, { headers, signal: timeoutSignal(15_000) });
            if (!userRes.ok) {
                const body = await userRes.text();
                throw new Error(`Could not resolve GitHub user: ${userRes.status} ${body}`);
            }
            const user = (await userRes.json());
            const owner = user.login;
            const repo = await this.findOrCreateRepo(headers, owner, safeName);
            if (repo.private) {
                const patchRes = await fetch(`${GITHUB_API}/repos/${owner}/${safeName}`, {
                    method: 'PATCH',
                    headers,
                    signal: timeoutSignal(15_000),
                    body: JSON.stringify({ private: false }),
                });
                if (patchRes.ok) {
                    repo.private = false;
                }
                else {
                    this.logger.warn(`Could not set repo ${owner}/${safeName} to public: ${patchRes.status}`);
                }
            }
            const repoUrl = repo.html_url;
            const sshUrl = repo.ssh_url;
            if (!files.length) {
                return { ok: true, repoUrl, sshUrl, uploaded: 0, requestId, ...auth };
            }
            await this.commitFiles(headers, owner, safeName, repo.default_branch || 'main', files);
            return { ok: true, repoUrl, sshUrl, uploaded: files.length, requestId, ...auth };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`GitHub push failed: ${message}`);
            return { ok: false, repoUrl: '', uploaded: 0, requestId, error: message };
        }
    }
    async getProject(accessToken, repoUrl, refreshToken) {
        const fullName = this.parseRepoFullName(repoUrl);
        if (!fullName)
            return { ok: false, error: 'Invalid repository URL' };
        if (!this.configured) {
            return {
                ok: true,
                project: {
                    id: 0,
                    name: fullName.split('/').pop() || '',
                    path: fullName.split('/').pop() || '',
                    path_with_namespace: fullName,
                    web_url: `https://github.com/${fullName}`,
                    ssh_url_to_repo: `git@github.com:${fullName}.git`,
                    http_url_to_repo: `https://github.com/${fullName}.git`,
                    visibility: 'public',
                },
            };
        }
        const auth = await this.ensureValidToken(accessToken, refreshToken);
        if (!auth) {
            return { ok: false, error: 'GitHub session expired. Please reconnect your GitHub account.' };
        }
        const headers = this.authHeaders(auth.accessToken);
        try {
            const res = await fetch(`${GITHUB_API}/repos/${fullName}`, { headers, signal: timeoutSignal(15_000) });
            if (!res.ok) {
                const body = await res.text();
                throw new Error(`Could not look up GitHub repo: ${res.status} ${body}`);
            }
            const repo = (await res.json());
            return {
                ok: true,
                project: this.normalizeRepo(repo),
                accessToken: auth.accessToken,
                refreshToken: auth.refreshToken,
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`GitHub getProject failed: ${message}`);
            return { ok: false, error: message };
        }
    }
    async findOrCreateRepo(headers, owner, name) {
        const findRes = await fetch(`${GITHUB_API}/repos/${owner}/${name}`, { headers, signal: timeoutSignal(15_000) });
        if (findRes.ok) {
            return (await findRes.json());
        }
        if (findRes.status !== 404) {
            const body = await findRes.text();
            throw new Error(`Could not look up GitHub repo: ${findRes.status} ${body}`);
        }
        const createRes = await fetch(`${GITHUB_API}/user/repos`, {
            method: 'POST',
            headers,
            signal: timeoutSignal(30_000),
            body: JSON.stringify({
                name,
                private: false,
                auto_init: true,
                default_branch: 'main',
            }),
        });
        if (!createRes.ok) {
            const body = await createRes.text();
            throw new Error(`Could not create GitHub repo: ${createRes.status} ${body}`);
        }
        return (await createRes.json());
    }
    async commitFiles(headers, owner, name, branch, files) {
        const base = `${GITHUB_API}/repos/${owner}/${name}`;
        let baseCommitSha;
        let baseTreeSha;
        const refRes = await fetch(`${base}/git/ref/heads/${branch}`, { headers, signal: timeoutSignal(15_000) });
        if (refRes.ok) {
            const ref = (await refRes.json());
            baseCommitSha = ref.object?.sha;
            if (baseCommitSha) {
                const commitRes = await fetch(`${base}/git/commits/${baseCommitSha}`, { headers, signal: timeoutSignal(15_000) });
                if (commitRes.ok) {
                    const commit = (await commitRes.json());
                    baseTreeSha = commit.tree?.sha;
                }
            }
        }
        const tree = [];
        const CONCURRENCY = 8;
        for (let i = 0; i < files.length; i += CONCURRENCY) {
            const batch = files.slice(i, i + CONCURRENCY);
            const shas = await Promise.all(batch.map(async (file) => {
                const blobRes = await fetch(`${base}/git/blobs`, {
                    method: 'POST',
                    headers,
                    signal: timeoutSignal(30_000),
                    body: JSON.stringify({
                        content: Buffer.from(file.content).toString('base64'),
                        encoding: 'base64',
                    }),
                });
                if (!blobRes.ok) {
                    const body = await blobRes.text();
                    throw new Error(`GitHub blob creation failed for ${file.path}: ${blobRes.status} ${body}`);
                }
                const blob = (await blobRes.json());
                return { path: file.path, sha: blob.sha };
            }));
            for (const item of shas) {
                tree.push({ path: item.path, mode: '100644', type: 'blob', sha: item.sha });
            }
        }
        const treeBody = { tree };
        if (baseTreeSha)
            treeBody.base_tree = baseTreeSha;
        const treeRes = await fetch(`${base}/git/trees`, {
            method: 'POST',
            headers,
            signal: timeoutSignal(60_000),
            body: JSON.stringify(treeBody),
        });
        if (!treeRes.ok) {
            const body = await treeRes.text();
            throw new Error(`GitHub tree creation failed: ${treeRes.status} ${body}`);
        }
        const newTree = (await treeRes.json());
        const commitBody = {
            message: 'Update from LoveCode',
            tree: newTree.sha,
        };
        if (baseCommitSha)
            commitBody.parents = [baseCommitSha];
        const commitRes = await fetch(`${base}/git/commits`, {
            method: 'POST',
            headers,
            signal: timeoutSignal(60_000),
            body: JSON.stringify(commitBody),
        });
        if (!commitRes.ok) {
            const body = await commitRes.text();
            throw new Error(`GitHub commit failed: ${commitRes.status} ${body}`);
        }
        const newCommit = (await commitRes.json());
        if (baseCommitSha) {
            const updateRef = await fetch(`${base}/git/refs/heads/${branch}`, {
                method: 'PATCH',
                headers,
                signal: timeoutSignal(30_000),
                body: JSON.stringify({ sha: newCommit.sha, force: true }),
            });
            if (!updateRef.ok) {
                const body = await updateRef.text();
                throw new Error(`GitHub ref update failed: ${updateRef.status} ${body}`);
            }
        }
        else {
            const createRef = await fetch(`${base}/git/refs`, {
                method: 'POST',
                headers,
                signal: timeoutSignal(30_000),
                body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: newCommit.sha }),
            });
            if (!createRef.ok) {
                const body = await createRef.text();
                throw new Error(`GitHub ref creation failed: ${createRef.status} ${body}`);
            }
        }
    }
    normalizeRepo(repo) {
        return {
            id: repo.id,
            name: repo.name,
            path: repo.name,
            path_with_namespace: repo.full_name,
            web_url: repo.html_url,
            ssh_url_to_repo: repo.ssh_url,
            http_url_to_repo: repo.clone_url,
            visibility: repo.private ? 'private' : 'public',
            default_branch: repo.default_branch,
        };
    }
    authHeaders(accessToken) {
        return {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        };
    }
    parseRepoFullName(repoUrl) {
        try {
            if (repoUrl.startsWith('git@')) {
                const match = repoUrl.match(/git@[^:]+:(.+?)(?:\.git)?$/);
                return match?.[1] ?? null;
            }
            const url = new URL(repoUrl);
            const path = url.pathname.replace(/^\//, '').replace(/\.git$/, '').replace(/\/+$/, '');
            return path || null;
        }
        catch {
            return null;
        }
    }
    sanitizeRepoName(name) {
        const trimmed = name.trim().replace(/\s+/g, '-');
        const safe = trimmed.replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
        return safe || 'lovecode-app';
    }
};
exports.GithubService = GithubService;
exports.GithubService = GithubService = GithubService_1 = __decorate([
    (0, common_1.Injectable)()
], GithubService);
//# sourceMappingURL=github.service.js.map