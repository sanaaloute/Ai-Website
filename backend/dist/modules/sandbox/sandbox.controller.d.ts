import { Response } from 'express';
import { User } from "../../types";
import { E2BService } from "../../lib/e2b.service";
import { StorageService } from "../../lib/storage.service";
import { IdempotencyService } from "../../lib/idempotency.service";
import { EntitlementsService } from "../billing/entitlements.service";
export declare class SandboxController {
    private readonly e2b;
    private readonly storage;
    private readonly idempotency;
    private readonly entitlements;
    private readonly logger;
    constructor(e2b: E2BService, storage: StorageService, idempotency: IdempotencyService, entitlements: EntitlementsService);
    createAiSandbox(user: User | undefined, body: {
        projectName?: string;
        skipSetup?: boolean;
        idempotencyKey?: string;
    }): Promise<{
        sandboxId: string;
        url: string;
        provider: string;
        createdAt: string;
        endAt: string;
        files?: Record<string, string>;
        structure?: string;
        fileCount?: number;
        success: boolean;
    }>;
    killSandbox(body: {
        sandboxId?: string;
    }): Promise<{
        success: boolean;
        sandboxKilled: boolean;
    }>;
    sandboxRenew(body: {
        sandboxId?: string;
    }): Promise<{
        success: boolean;
        oldSandboxId: string;
        newSandboxId: string;
        url: string;
        createdAt: string;
        endAt: string;
        filesMigrated: number;
    }>;
    sandboxStatus(sandboxId: string): Promise<{
        success: boolean;
        active: boolean;
        healthy: boolean;
        sandboxData: import("@/types").SandboxData;
        reason?: undefined;
    } | {
        success: boolean;
        active: boolean;
        healthy: boolean;
        reason: string;
        sandboxData: null;
    }>;
    sandboxLogs(sandboxId: string): Promise<{
        success: boolean;
        logs: string[];
        status: string;
    }>;
    getSandboxSnapshot(user: User, projectId: string, sandboxId: string): Promise<{
        success: boolean;
        snapshot: Record<string, unknown>;
    }>;
    saveSandboxSnapshot(user: User, body: Record<string, unknown>): Promise<{
        success: boolean;
        snapshot: Record<string, unknown>;
        path: string | null;
    }>;
    restartPreview(body: {
        sandboxId?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    runCommand(body: {
        sandboxId?: string;
        command?: string;
    }): Promise<{
        success: boolean;
        output: string;
        error: string;
        exitCode: number;
        message: string;
    }>;
    getSandboxFile(sandboxId: string, filePath: string): Promise<{
        success: boolean;
        path: string;
        content: string | null;
    }>;
    writeSandboxFile(body: {
        sandboxId?: string;
        path?: string;
        content?: string;
    }): Promise<{
        success: boolean;
        path: string;
    }>;
    renameSandboxFile(body: {
        sandboxId?: string;
        path?: string;
        newPath?: string;
    }): Promise<{
        success: boolean;
        oldPath: string;
        newPath: string;
    }>;
    deleteSandboxFile(sandboxId: string, filePath: string): Promise<{
        success: boolean;
        path: string;
    }>;
    installPackages(body: {
        sandboxId?: string;
        packages?: string[];
    }, res: Response): Promise<void>;
    getSandboxFiles(sandboxId: string, maxFiles?: string): Promise<{
        files: Record<string, string>;
        structure: string;
        fileCount: number;
        manifest: Record<string, unknown>;
        success: boolean;
    }>;
    getSandboxFilesBinary(sandboxId: string): Promise<{
        success: boolean;
        files: Record<string, string>;
        fileCount: number;
    }>;
    getSandboxPocketbaseInfo(sandboxId: string): Promise<{
        success: boolean;
        url: null;
        adminEmail: null;
        adminPassword: null;
        message: string;
        adminUrl?: undefined;
    } | {
        success: boolean;
        url: string;
        adminUrl: string;
        adminEmail: string;
        adminPassword: string;
        message?: undefined;
    }>;
    previewHealth(body: {
        sandboxId?: string;
        previewUrl?: string;
        timeoutMs?: number;
    }): Promise<{
        success: boolean;
        active: boolean;
        reachable: boolean;
        sandboxId: string;
        previewUrl: string | undefined;
        statusCode: number;
        diagnostics: {};
        reason: null;
    }>;
    monitorPreviewLogs(sandboxId: string): Promise<{
        success: boolean;
        hasErrors: boolean;
        errors: Record<string, string>[];
    }>;
    reportPreviewError(body: {
        error?: string;
        file?: string;
        type?: string;
        sandboxId?: string;
    }): {
        success: boolean;
        error: {
            type: string;
            message: string;
            file: string;
            timestamp: string;
        };
    };
    checkPreviewErrors(): {
        success: boolean;
        hasErrors: boolean;
        errors: never[];
        storage: string;
    };
    previewInlineText(body: {
        sandboxId?: string;
        relativePath?: string;
        lineNumber?: number;
        oldText?: string;
        newText?: string;
    }): Promise<{
        success: boolean;
        path: string;
    }>;
    getSandboxFileLegacy(sandboxId: string, path: string): Promise<{
        success: boolean;
        path: string;
        content: string;
    }>;
    restoreSandboxSnapshot(body: {
        sandboxId?: string;
        snapshotId?: string;
    }): Promise<{
        success: boolean;
    }>;
}
