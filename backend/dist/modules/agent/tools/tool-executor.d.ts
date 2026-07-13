import type { StructuredTool } from '@langchain/core/tools';
import type { ToolCall } from './tool-definitions';
export interface ToolExecutionResult {
    toolCallId: string;
    name: string;
    content: string;
    success: boolean;
}
export declare function executeToolCall(toolCall: ToolCall, tools: StructuredTool[], signal?: AbortSignal, maxAttempts?: number): Promise<ToolExecutionResult>;
