import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
export declare function analyzerNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
