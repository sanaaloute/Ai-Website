import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
interface SecurityPattern {
    name: string;
    severity: 'critical' | 'high' | 'medium';
    regex: string;
}
export declare const PATTERNS: SecurityPattern[];
export interface SecurityReviewResult {
    securityIssues: string[];
    lastVerificationStage?: string;
    verificationFailures?: string[];
    messages: Array<{
        role: string;
        content: string;
    }>;
}
export declare function runSecurityReview(state: AgentState, deps: GraphDependencies): Promise<SecurityReviewResult>;
export declare function securityReviewerNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
export {};
