interface PushFile {
    path: string;
    content: string;
}
interface TokenPair {
    access_token: string;
    refresh_token?: string;
}
export interface GithubProject {
    id: number;
    name: string;
    path: string;
    path_with_namespace: string;
    web_url: string;
    ssh_url_to_repo: string;
    http_url_to_repo: string;
    visibility: 'private' | 'public';
    default_branch?: string;
}
export interface PushResult {
    ok: boolean;
    repoUrl: string;
    uploaded: number;
    requestId: string;
    error?: string;
    accessToken?: string;
    refreshToken?: string;
    sshUrl?: string;
}
export declare class GithubService {
    private readonly logger;
    get configured(): boolean;
    authorizeUrl(state: string, next?: string): string;
    exchangeCode(code: string): Promise<TokenPair | null>;
    refreshAccessToken(refreshToken: string): Promise<TokenPair | null>;
    ensureValidToken(accessToken: string, refreshToken?: string): Promise<{
        accessToken: string;
        refreshToken?: string;
    } | null>;
    push(accessToken: string, repoName: string, files: PushFile[], refreshToken?: string): Promise<PushResult>;
    getProject(accessToken: string, repoUrl: string, refreshToken?: string): Promise<{
        ok: false;
        error: string;
    } | {
        ok: true;
        project: GithubProject;
        accessToken?: string;
        refreshToken?: string;
    }>;
    private findOrCreateRepo;
    private commitFiles;
    private normalizeRepo;
    private authHeaders;
    parseRepoFullName(repoUrl: string): string | null;
    private sanitizeRepoName;
}
export {};
