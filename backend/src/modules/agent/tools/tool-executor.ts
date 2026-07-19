import type { StructuredTool } from '@langchain/core/tools';
import type { ToolCall } from './tool-definitions';
import { isCancellation, sleepWithSignal, throwIfCancelled } from '@/lib/cancellation';
import { isDeterministicToolError } from './errors';
import { env } from '@/config/env';

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
 * Cap a tool result before it is appended to the model's message history.
 * Without a cap, a single read_file/run_command on a large file floods the
 * context window (AGENT_TOOL_RESULT_MAX_CHARS, default 20000).
 */
function truncateToolResult(content: string): string {
  const max = env().agentToolResultMaxChars;
  if (content.length <= max) return content;
  return (
    content.slice(0, max) +
    `\n\n[TRUNCATED: result was ${content.length} chars, showing first ${max}. ` +
    `Narrow the query (smaller file range, more specific command, grep with include_pattern) to see more.]`
  );
}

/**
 * Execute a single tool call against a set of LangChain StructuredTools.
 *
 * Tool invocations are retried up to MAX_TOOL_ATTEMPTS times with a backoff —
 * transient sandbox/network errors should not fail the whole step. Deterministic
 * errors (validation, protected paths, exact-match misses) are returned
 * immediately: retrying them can never succeed. The retry loop honours the
 * cancellation signal so a user stop takes effect immediately.
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
  let attemptsUsed = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attemptsUsed = attempt;
    throwIfCancelled(signal);
    try {
      const result = await tool.invoke(args);
      return {
        toolCallId: toolCall.id,
        name: toolCall.function.name,
        content: truncateToolResult(typeof result === 'string' ? result : JSON.stringify(result)),
        success: true,
      };
    } catch (err) {
      if (isCancellation(err)) {
        throw err;
      }
      lastError = err;
      if (isDeterministicToolError(err)) {
        break; // retrying cannot help — return the error to the model at once
      }
      if (attempt < maxAttempts) {
        await sleepWithSignal(500 * attempt, signal);
      }
    }
  }

  return {
    toolCallId: toolCall.id,
    name: toolCall.function.name,
    content: truncateToolResult(
      `Error executing ${toolCall.function.name}${attemptsUsed > 1 ? ` after ${attemptsUsed} attempts` : ''}: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    ),
    success: false,
  };
}
