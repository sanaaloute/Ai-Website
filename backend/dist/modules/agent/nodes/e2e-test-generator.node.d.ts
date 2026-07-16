import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
export interface E2eTestResult {
    e2eFailures: string[];
    e2eTestsWritten: string[];
    lastVerificationStage?: string;
    verificationFailures?: string[];
    messages: Array<{
        role: string;
        content: string;
    }>;
}
export declare function runE2eTests(state: AgentState, deps: GraphDependencies, previewUrl: string, routesSource: string): Promise<E2eTestResult>;
export declare function e2eTestGeneratorNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
