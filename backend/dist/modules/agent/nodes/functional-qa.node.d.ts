import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
export interface FunctionalQaResult {
    functionalIssues: string[];
    lastVerificationStage?: string;
    verificationFailures?: string[];
    messages: Array<{
        role: string;
        content: string;
    }>;
}
export declare function runFunctionalQa(state: AgentState, deps: GraphDependencies, previewUrl: string, routesSource: string): Promise<FunctionalQaResult>;
export declare function functionalQaNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
