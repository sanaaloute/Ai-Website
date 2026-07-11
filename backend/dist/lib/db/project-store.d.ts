export interface ProjectRecord {
    id: string;
    name: string;
    userId?: string;
    createdAt: string;
    updatedAt: string;
}
export declare function upsertProject(id: string, name: string, userId?: string): void;
export declare function getProject(id: string): ProjectRecord | undefined;
export declare function upsertFile(projectId: string, filePath: string, content: string): void;
export declare function deleteFile(projectId: string, filePath: string): void;
export declare function upsertFilesBulk(projectId: string, filesToSave: Array<{
    path: string;
    content: string;
}>): number;
