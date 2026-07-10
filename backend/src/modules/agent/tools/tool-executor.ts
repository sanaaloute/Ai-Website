import type { StructuredTool } from '@langchain/core/tools';
import type { ToolCall } from './tool-definitions';

export interface ToolExecutionResult {
  toolCallId: string;
  name: string;
  content: string;
  /** True when the tool returned normally; false when it threw. */
  success: boolean;
}

/**
 * Execute a single tool call against a set of LangChain StructuredTools.
 */
export async function executeToolCall(
  toolCall: ToolCall,
  tools: StructuredTool[],
): Promise<ToolExecutionResult> {
  const tool = tools.find((t) => t.name === toolCall.function.name);
  if (!tool) {
    return {
      toolCallId: toolCall.id,
      name: toolCall.function.name,
      content: `Error: unknown tool ${toolCall.function.name}`,
      success: false,
    };
  }

  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(toolCall.function.arguments);
  } catch {
    return {
      toolCallId: toolCall.id,
      name: toolCall.function.name,
      content: 'Error: invalid JSON arguments',
      success: false,
    };
  }

  try {
    const result = await tool.invoke(args);
    return {
      toolCallId: toolCall.id,
      name: toolCall.function.name,
      content: typeof result === 'string' ? result : JSON.stringify(result),
      success: true,
    };
  } catch (err) {
    return {
      toolCallId: toolCall.id,
      name: toolCall.function.name,
      content: `Error executing ${toolCall.function.name}: ${err instanceof Error ? err.message : String(err)}`,
      success: false,
    };
  }
}
