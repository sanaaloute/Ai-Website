/**
 * Stream writer used by tools to emit progress events.
 * The default implementation forwards events to a LangGraph-style emit callback.
 */

export interface AgentToolEvent {
  type: string;
  data: Record<string, unknown>;
}

export interface StreamWriter {
  write(event: AgentToolEvent): void;
}

export class NoOpStreamWriter implements StreamWriter {
  write(_event: AgentToolEvent): void {
    // no-op
  }
}

export class CallbackStreamWriter implements StreamWriter {
  constructor(private readonly callback: (event: AgentToolEvent) => void | Promise<void>) {}

  write(event: AgentToolEvent): void {
    try {
      const result = this.callback(event);
      if (result instanceof Promise) {
        result.catch((err) => console.warn('StreamWriter callback error:', err));
      }
    } catch (err) {
      console.warn('StreamWriter callback error:', err);
    }
  }
}

/**
 * Builds a lightweight file_update event containing only metadata. The full
 * content is left in the sandbox; the frontend fetches it lazily via
 * GET /api/get-sandbox-file. This avoids bloating the SSE stream with full
 * file contents for every written file.
 */
export function createFileUpdateEvent(
  path: string,
  content: string,
  status: string,
): AgentToolEvent {
  return {
    type: 'file_update',
    data: {
      path,
      status,
      size: content.length,
      lineCount: content.split('\n').length,
    },
  };
}
