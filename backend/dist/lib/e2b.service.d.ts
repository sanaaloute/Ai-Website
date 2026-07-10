import { Sandbox } from 'e2b';
import { SandboxData } from "../types";
import { SandboxStateService, type PocketbaseInfo } from './sandbox-state.service';
export declare const WORKDIR = "/home/user/app";
export declare const FORBIDDEN_PATH_PREFIXES: string[];
export declare const FORBIDDEN_FILE_NAMES: Set<string>;
export type SandboxFramework = 'next' | 'vite';
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
export declare class E2BService {
    private readonly state;
    private readonly logger;
    private readonly sandboxes;
    private readonly frameworks;
    constructor(state: SandboxStateService);
    get configured(): boolean;
    createSandbox(opts?: {
        skipSetup?: boolean;
    }): Promise<SandboxData>;
    private getCurrentSandboxId;
    private getSandboxLifetime;
    attach(sandboxId: string): Promise<SandboxData>;
    kill(sandboxId: string): Promise<boolean>;
    getSandboxInfos(): Promise<Array<{
        sandboxId: string;
        createdAt: string;
        endAt: string;
        renewing?: boolean;
    }>>;
    setRenewing(sandboxId: string, renewing: boolean): Promise<void>;
    removeSandboxInfo(sandboxId: string): Promise<void>;
    snapshotSandbox(sandboxId: string, snapshotId: string): Promise<void>;
    restoreSandboxSnapshot(sandboxId: string, snapshotId: string): Promise<boolean>;
    private registerRenewal;
    renewSandbox(oldSandboxId: string): Promise<SandboxData & {
        filesMigrated: number;
    }>;
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
    restartPreview(sandboxId: string): Promise<boolean>;
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
    prepareNextSandbox(sandboxId: string, _category: string): Promise<{
        ok: boolean;
        url: string;
    }>;
    private ensurePocketbaseAdminUser;
    private initializeProject;
    private previewUrl;
    detectFramework(sandboxId: string): Promise<SandboxFramework>;
    getPreviewUrl(sandboxId: string): Promise<string>;
    getSandboxUrl(sandboxId: string): Promise<string>;
}
