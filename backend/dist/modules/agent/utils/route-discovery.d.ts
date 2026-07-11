import { E2BService } from "../../../lib/e2b.service";
export declare function discoverRoutes(source: string, needsIntegration?: string | null): string[];
export declare function readRoutes(e2b: E2BService, sandboxId: string): Promise<string>;
