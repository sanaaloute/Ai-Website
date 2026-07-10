import type { StructuredTool } from '@langchain/core/tools';
export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, unknown>;
            required?: string[];
        };
    };
}
export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}
export declare function toolToDefinition(tool: StructuredTool): ToolDefinition;
export declare function toolsToDefinitions(tools: StructuredTool[]): ToolDefinition[];
