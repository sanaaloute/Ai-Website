import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
export declare function verificationNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
