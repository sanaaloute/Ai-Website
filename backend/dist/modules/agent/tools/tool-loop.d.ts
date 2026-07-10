import type { StructuredTool } from '@langchain/core/tools';
import type { GraphDependencies } from '../graph';
import type { AgentState, TodoItem } from '../state';
import type { AgentContext } from '../types';
import { type FileStatus } from './file-manifest';
import type { ToolCall } from './tool-definitions';
export interface ToolLoopMessage {
    role: string;
    content: string | null;
    tool_call_id?: string;
    name?: string;
    tool_calls?: ToolCall[];
}
export interface ToolLoopResult {
    finalContent: string;
    todos: TodoItem[];
    filesChanged: FileStatus[];
}
export declare function runToolLoop(deps: GraphDependencies, state: AgentState, buildTools: (context: AgentContext, docsTools: StructuredTool[]) => StructuredTool[], messages: ToolLoopMessage[], nodeType: string, userApiKey?: string, maxIterations?: number): Promise<ToolLoopResult>;
