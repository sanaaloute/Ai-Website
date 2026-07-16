import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
export interface A11yReviewResult {
    a11yIssues: string[];
    lastVerificationStage?: string;
    verificationFailures?: string[];
    messages: Array<{
        role: string;
        content: string;
    }>;
}
export declare function runA11yReview(state: AgentState, deps: GraphDependencies, previewUrl: string, routesSource: string): Promise<A11yReviewResult>;
export declare function a11yReviewerNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
