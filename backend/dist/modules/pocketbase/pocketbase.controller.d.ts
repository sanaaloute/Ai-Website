import { User } from "../../types";
import { E2BService } from "../../lib/e2b.service";
import { PocketbaseService } from "../../lib/pocketbase.service";
declare class PrepareDeployDto {
    projectName: string;
    domain: string;
    pbSubdomainPrefix?: string;
}
export declare class PocketbaseController {
    private readonly pocketbase;
    private readonly e2b;
    constructor(pocketbase: PocketbaseService, e2b: E2BService);
    getTemplate(_user: User, category?: string): Promise<{
        success: boolean;
        category: string;
        schema: Record<string, unknown>;
        sdkSource: string;
        files: import("@/lib/pocketbase.service").PocketBaseTemplateFile[];
        fileCount: number;
    }>;
    prepareDeploy(_user: User, body: PrepareDeployDto): Promise<{
        success: boolean;
        frontendUrl: string;
        pocketbaseUrl: string;
        adminUrl: string;
        adminEmail: string;
        adminPassword: string;
        files: import("@/lib/pocketbase.service").PocketBaseTemplateFile[];
        fileCount: number;
    }>;
    getPocketbaseInfo(_user: User, sandboxId: string): Promise<{
        success: boolean;
        url: null;
        adminUrl: null;
        adminEmail: null;
        adminPassword: null;
        message: string;
    } | {
        success: boolean;
        url: string;
        adminUrl: string;
        adminEmail: string;
        adminPassword: string;
        message?: undefined;
    }>;
}
export {};
