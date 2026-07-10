import { Response } from 'express';
import { User, ProjectSummary } from "../../types";
import { StorageService } from "../../lib/storage.service";
import { IdempotencyService } from "../../lib/idempotency.service";
import { SupabaseService } from "../../lib/supabase.service";
import { E2BService } from "../../lib/e2b.service";
import { ProjectService } from "./project.service";
export declare class ProjectController {
    private readonly storage;
    private readonly supabase;
    private readonly e2b;
    private readonly idempotency;
    private readonly projectService;
    private readonly logger;
    constructor(storage: StorageService, supabase: SupabaseService, e2b: E2BService, idempotency: IdempotencyService, projectService: ProjectService);
    listProjects(user: User): Promise<{
        success: boolean;
        projects: ProjectSummary[];
    }>;
    deleteProject(user: User, body: {
        projectId?: string;
    }): Promise<{
        success: boolean;
        projectId: string;
    }>;
    renameProject(user: User, body: {
        projectId?: string;
        projectName?: string;
    }): Promise<{
        success: boolean;
        projectId: string;
        projectName: string;
    }>;
    saveProject(user: User, body: Record<string, unknown>): Promise<{
        success: boolean;
        projectId: string;
        projectName: string;
        savedFiles: number;
        storageFilesUploaded: number;
        zipPath: string;
        zipUploaded: boolean;
        dbSynced: boolean;
        warnings: never[];
    }>;
    private doSaveProject;
    openProject(user: User, body: {
        projectId?: string;
        targetSandboxId?: string;
    }): Promise<{
        success: boolean;
        restoreSource: string;
        restoredCount: number;
        sandboxData: import("@/types").SandboxData;
        warnings: string[];
        snapshot: Record<string, unknown>;
    }>;
    restoreLocal(body: {
        projectId?: string;
        sandboxId?: string;
    }): Promise<{
        success: boolean;
        projectId: string | undefined;
        sandboxId: string | undefined;
        restoredCount: number;
        totalFiles: number;
        errors: string[];
    }>;
    createZip(user: User, body: {
        sandboxId?: string;
        projectId?: string;
        projectName?: string;
    }): Promise<{
        success: boolean;
        downloadUrl: string;
        fileName: string;
        message: string;
    }>;
    downloadRepo(repoUrl: string, res: Response): Promise<void>;
}
