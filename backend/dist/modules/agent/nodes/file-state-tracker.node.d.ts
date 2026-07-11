import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
export declare function fileStateTrackerNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
