import { E2BService } from "../../lib/e2b.service";
export declare class E2BController {
    private readonly e2b;
    constructor(e2b: E2BService);
    attach(body: {
        sandboxId?: string;
    }): Promise<{
        success: boolean;
        recovered: boolean;
        sandboxData: import("../../types").SandboxData;
    }>;
    cloneRepo(body: {
        sandboxId?: string;
        repoUrl?: string;
    }): Promise<{
        success: boolean;
        files: Record<string, string>;
        structure: string;
        fileCount: number;
    }>;
    sandboxes(state?: string, limit?: string): Promise<{
        success: boolean;
        sandboxes: Record<string, unknown>[];
    }>;
    terminate(body: {
        sandboxId?: string;
    }): Promise<{
        success: boolean;
        sandboxKilled: boolean;
    }>;
}
