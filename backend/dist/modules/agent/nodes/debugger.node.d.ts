import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
export declare function debuggerNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
