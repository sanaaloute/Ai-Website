import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
interface SecurityPattern {
    name: string;
    severity: 'critical' | 'high' | 'medium';
    regex: string;
}
export declare const PATTERNS: SecurityPattern[];
export declare function securityReviewerNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
export {};
