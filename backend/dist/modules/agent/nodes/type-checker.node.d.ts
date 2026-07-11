import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
export declare function typeCheckerNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
