import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
export interface SeoMetaResult {
    seoGenerated: boolean;
    verificationFailures?: string[];
    messages: Array<{
        role: string;
        content: string;
    }>;
}
export declare function runSeoMeta(state: AgentState, deps: GraphDependencies, previewUrl: string, routesSource: string): Promise<SeoMetaResult>;
export declare function seoMetaNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>>;
