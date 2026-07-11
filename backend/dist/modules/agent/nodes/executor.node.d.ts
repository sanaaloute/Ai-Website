import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
export declare function executorNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
