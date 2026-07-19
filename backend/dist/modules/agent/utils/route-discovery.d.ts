import { E2BService } from "../../../lib/e2b.service";
import { AgentState } from '../state';
export declare function discoverRoutes(source: string, needsIntegration?: string | null): string[];
export declare function readRoutes(e2b: E2BService, sandboxId: string): Promise<string>;
export declare function getRoutesSource(e2b: E2BService, sandboxId: string, state: AgentState): Promise<{
    source: string;
    cached: boolean;
}>;
