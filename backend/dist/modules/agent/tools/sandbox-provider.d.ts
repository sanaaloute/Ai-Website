import { E2BService } from "../../../lib/e2b.service";
export interface CommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    success: boolean;
}
export interface StartPocketBaseResult {
    url: string;
    template: {
        id: string;
    };
    collectionsCreated: string[];
    recordsSeeded: number;
}
export declare class SandboxProvider {
    private readonly e2b;
    private readonly projectId?;
    private readonly logger;
    private sandboxId;
    constructor(e2b: E2BService, sandboxId: string, projectId?: string | undefined);
    get currentSandboxId(): string;
    ensureAlive(_userId?: string): Promise<string>;
    readFile(inputPath: string): Promise<string>;
    writeFile(inputPath: string, content: string): Promise<void>;
    writeSystemFile(inputPath: string, content: string): Promise<void>;
    runCommand(command: string, cwd?: string, opts?: {
        timeoutMs?: number;
        onStdout?: (data: string) => void | Promise<void>;
        onStderr?: (data: string) => void | Promise<void>;
    }): Promise<CommandResult>;
    listFiles(directory?: string): Promise<string[]>;
    getSandboxUrl(): Promise<string>;
    startPocketBase(options?: {
        templateId?: string;
    }): Promise<StartPocketBaseResult>;
    restartPreview(): Promise<boolean>;
    ensurePreviewRunning(): Promise<boolean>;
    isPreviewHealthy(): Promise<boolean>;
    installPackage(packageName: string): Promise<CommandResult>;
    private toRelativePath;
    private toAbsolutePath;
}
