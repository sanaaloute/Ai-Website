import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
export declare function validatePlan(steps: string[], newFiles: string[]): {
    errors: string[];
    warnings: string[];
};
export declare function preFlightValidatorNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
