import { ToolInputParsingException } from '@langchain/core/tools';

/**
 * Error classification for the tool layer.
 *
 * DeterministicToolError marks failures that can NEVER succeed on retry:
 * schema/validation problems, protected-path violations, path traversal,
 * exact-match misses. Retrying them only burns latency and floods the event
 * stream with duplicate tool_start/tool_end noise, so executeToolCall returns
 * them to the model immediately instead of doing 3 backoff attempts.
 */
export class DeterministicToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeterministicToolError';
  }
}

export function isDeterministicToolError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof DeterministicToolError) return true;
  // @langchain/core wraps tool-arg schema validation failures in
  // ToolInputParsingException (its `name` is just 'Error', so name-matching
  // is not enough) — the same args will fail identically on every retry.
  if (err instanceof ToolInputParsingException) return true;
  const name = (err as { name?: string }).name;
  return name === 'ZodError';
}
