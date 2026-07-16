import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
export interface VisualQaResult {
    visualIssues: string[];
    screenshots: Array<{
        path: string;
        route: string;
    }>;
    lastVerificationStage?: string;
    verificationFailures?: string[];
    messages: Array<{
        role: string;
        content: string;
    }>;
}
export declare function runVisualQa(state: AgentState, deps: GraphDependencies, previewUrl: string, routesSource: string): Promise<VisualQaResult>;
export declare function visualQaNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
