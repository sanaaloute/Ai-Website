import type { StructuredTool } from '@langchain/core/tools';
import type { ToolCall } from './tool-definitions';
import { isCancellation, sleepWithSignal, throwIfCancelled } from '@/lib/cancellation';

export interface ToolExecutionResult {
  toolCallId: string;
  name: string;
  content: string;
  /** True when the tool returned normally; false when it threw. */
  success: boolean;
}

/** How many times a failing tool call is retried before giving up. */
const MAX_TOOL_ATTEMPTS = 3;

/**
 * Execute a single tool call against a set of LangChain StructuredTools.
 *
 * Tool invocations are retried up to MAX_TOOL_ATTEMPTS times with a backoff —
 * transient sandbox/network errors should not fail the whole step. The retry
 * loop honours the cancellation signal so a user stop takes effect immediately.
 */
export async function executeToolCall(
  toolCall: ToolCall,
  tools: StructuredTool[],
  signal?: AbortSignal,
  maxAttempts: number = MAX_TOOL_ATTEMPTS,
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

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    throwIfCancelled(signal);
    try {
      const result = await tool.invoke(args);
      return {
        toolCallId: toolCall.id,
        name: toolCall.function.name,
        content: typeof result === 'string' ? result : JSON.stringify(result),
        success: true,
      };
    } catch (err) {
      if (isCancellation(err)) {
        throw err;
      }
      lastError = err;
      if (attempt < maxAttempts) {
        await sleepWithSignal(500 * attempt, signal);
      }
    }
  }

  return {
    toolCallId: toolCall.id,
    name: toolCall.function.name,
    content: `Error executing ${toolCall.function.name} after ${maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    success: false,
  };
}
