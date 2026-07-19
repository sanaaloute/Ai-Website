/**
 * Cooperative cancellation primitives shared by the agent workflow.
 *
 * The workflow can be stopped by the user at any level (between graph nodes,
 * inside a tool loop, mid LLM stream, mid tool call). Every long-running layer
 * checks the AbortSignal and throws a CancelledError, which propagates up to
 * the job processor without being swallowed by retry/failover logic.
 */

export const CANCELLED_MESSAGE = 'Cancelled by user';

export class CancelledError extends Error {
  constructor(message: string = CANCELLED_MESSAGE) {
    super(message);
    this.name = 'CancelledError';
  }
}

/**
 * Tag used as the AbortController.abort(reason) when the processor's job
 * watchdog fires. Without a tagged reason, a timeout abort is
 * indistinguishable from a user cancel downstream (isCancellation matches
 * AbortError) — which is how "Cancelled by user" ended up on timed-out jobs.
 */
export class JobTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JobTimeoutError';
  }
}

export function isJobTimeoutError(err: unknown): boolean {
  if (!err) return false;
  return (err as { name?: string }).name === 'JobTimeoutError';
}

export function isCancellation(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof CancelledError) return true;
  const e = err as { name?: string; message?: string };
  return (
    e.name === 'CancelledError' ||
    e.name === 'AbortError' ||
    e.message === CANCELLED_MESSAGE
  );
}

export function throwIfCancelled(signal?: AbortSignal | null): void {
  if (signal?.aborted) {
    throw new CancelledError();
  }
}

/**
 * Sleep that resolves after `ms`, or rejects with CancelledError as soon as the
 * signal aborts — used so retry backoffs don't delay a user-requested stop.
 */
export function sleepWithSignal(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new CancelledError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new CancelledError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Combine multiple abort signals into one (e.g. a timeout signal + a user
 * cancellation signal) for a single fetch() call.
 */
export function combineAbortSignals(
  ...signals: Array<AbortSignal | undefined | null>
): AbortSignal | undefined {
  const active = signals.filter((s): s is AbortSignal => !!s);
  if (active.length === 0) return undefined;
  if (active.length === 1) return active[0];
  const anyFn = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  if (typeof anyFn === 'function') {
    return anyFn(active);
  }
  const controller = new AbortController();
  for (const s of active) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}
