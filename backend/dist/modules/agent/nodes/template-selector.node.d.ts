import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
export interface TemplateCopyResult {
    category: string;
    templateFiles: Record<string, string>;
    writtenCount: number;
}
export declare function startTemplateCopy(deps: GraphDependencies, sandboxId: string, category: string): void;
export declare function templateSelectorNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
