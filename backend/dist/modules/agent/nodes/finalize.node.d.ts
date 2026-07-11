import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
export declare function finalizeNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
