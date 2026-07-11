import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
export declare function plannerNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
