import { Sandbox } from 'e2b';
import { SandboxData } from "../types";
import { EntitlementsService } from "../modules/billing/entitlements.service";
import { SandboxStateService, type PocketbaseInfo } from './sandbox-state.service';
export declare const WORKDIR = "/home/user/app";
export declare function withTransientRetry<T>(label: string, fn: () => Promise<T>, logger?: {
    warn: (message: string) => void;
}, maxAttempts?: number, delayMs?: number): Promise<T>;
export declare const FORBIDDEN_PATH_PREFIXES: string[];
export declare const FORBIDDEN_FILE_NAMES: Set<string>;
export declare function isForbiddenPath(relativePath: string): boolean;
export declare class E2BNotConfiguredError extends Error {
    constructor();
}
export declare class SandboxNotFoundError extends Error {
    constructor();
}
export declare class SandboxGoneError extends Error {
    constructor();
}
export declare class E2BProviderError extends Error {
    constructor(message: string);
}
export declare function isSandboxGoneError(err: unknown): boolean;
export declare class E2BService {
    private readonly state;
    private readonly entitlements;
    private readonly logger;
    private readonly sandboxes;
    constructor(state: SandboxStateService, entitlements: EntitlementsService);
    get configured(): boolean;
    createSandbox(opts?: {
        skipSetup?: boolean;
        userId?: string;
    }): Promise<SandboxData>;
    private getCurrentSandboxId;
    private getSandboxLifetime;
    attach(sandboxId: string): Promise<SandboxData>;
    private finalizeSegment;
    kill(sandboxId: string): Promise<boolean>;
    getSandboxInfos(): Promise<Array<{
        sandboxId: string;
        createdAt: string;
        endAt: string;
        renewing?: boolean;
        renewingSince?: number;
        userId?: string;
    }>>;
    setRenewing(sandboxId: string, renewing: boolean): Promise<void>;
    removeSandboxInfo(sandboxId: string): Promise<void>;
    snapshotSandbox(sandboxId: string, snapshotId: string): Promise<void>;
    restoreSandboxSnapshot(sandboxId: string, snapshotId: string): Promise<boolean>;
    private registerRenewal;
    renewSandbox(oldSandboxId: string): Promise<SandboxData & {
        filesMigrated: number;
        sourceGone?: boolean;
    }>;
    private killSandboxDirect;
    private doRenewSandbox;
    runCommand(sandboxId: string, command: string, cwd?: string, opts?: {
        timeoutMs?: number;
        onStdout?: (data: string) => void | Promise<void>;
        onStderr?: (data: string) => void | Promise<void>;
    }): Promise<{
        output: string;
        error: string;
        exitCode: number;
    }>;
    readFile(sandboxId: string, relativePath: string): Promise<string | null>;
    ensureAlive(sandboxId: string): Promise<SandboxData>;
    readFiles(sandboxId: string, opts?: {
        maxFiles?: number | null;
        excludePrefixes?: string[];
    }): Promise<{
        files: Record<string, string>;
        structure: string;
        fileCount: number;
        manifest: Record<string, unknown>;
    }>;
    writeFile(sandboxId: string, relativePath: string, content: string): Promise<boolean>;
    writeSystemFile(sandboxId: string, relativePath: string, content: string): Promise<boolean>;
    deleteFile(sandboxId: string, relativePath: string): Promise<boolean>;
    renameFile(sandboxId: string, relativePath: string, newRelativePath: string): Promise<boolean>;
    private writeFileInternal;
    writeFilesBatch(sandboxId: string, files: Array<{
        relativePath: string;
        content: string;
    }>): Promise<string[]>;
    restartPreview(sandboxId: string, opts?: {
        force?: boolean;
    }): Promise<boolean>;
    private shouldInstallDependencies;
    recordPackageJsonHash(sandboxId: string): Promise<void>;
    ensurePreviewRunning(sandboxId: string): Promise<boolean>;
    previewHealth(previewUrl: string): Promise<{
        reachable: boolean;
        statusCode?: number;
    }>;
    listRunning(): Promise<Array<Record<string, unknown>>>;
    getSandbox(sandboxId: string): Promise<Sandbox | null>;
    getPocketbaseInfo(sandboxId: string): Promise<PocketbaseInfo | null>;
    private resolvePocketbaseTemplateDir;
    private setupPocketbase;
    private startPocketbase;
    private initializePocketbaseData;
    reconfigurePocketbaseForCategory(sandboxId: string, category: string): Promise<{
        url: string;
        adminEmail: string;
        adminPassword: string;
    } | null>;
    private ensurePocketbaseAdminUser;
    private initializeProject;
    private previewUrl;
    getPreviewUrl(sandboxId: string): Promise<string>;
    getSandboxUrl(sandboxId: string): Promise<string>;
}
