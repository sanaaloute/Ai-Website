export interface FileStatus {
    path: string;
    status: 'created' | 'modified' | 'deleted';
    lastModified: string;
}
export declare class FileManifest {
    private readonly files;
    isProtected(filePath: string): boolean;
    updateFile(filePath: string, status: 'created' | 'modified' | 'deleted'): Promise<void>;
    getFileStatus(filePath: string): {
        path: string;
        status?: string;
        lastModified?: string;
    };
    listChanged(): FileStatus[];
    getProtectedPaths(): string[];
    private normalizePath;
}
export declare function normalizeFilePath(filePath: string): string;
export declare function ensureTypeScriptExtension(filePath: string): string;
