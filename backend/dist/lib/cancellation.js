"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobTimeoutError = exports.CancelledError = exports.CANCELLED_MESSAGE = void 0;
exports.isJobTimeoutError = isJobTimeoutError;
exports.isCancellation = isCancellation;
exports.throwIfCancelled = throwIfCancelled;
exports.sleepWithSignal = sleepWithSignal;
exports.combineAbortSignals = combineAbortSignals;
exports.CANCELLED_MESSAGE = 'Cancelled by user';
class CancelledError extends Error {
    constructor(message = exports.CANCELLED_MESSAGE) {
        super(message);
        this.name = 'CancelledError';
    }
}
exports.CancelledError = CancelledError;
class JobTimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'JobTimeoutError';
    }
}
exports.JobTimeoutError = JobTimeoutError;
function isJobTimeoutError(err) {
    if (!err)
        return false;
    return err.name === 'JobTimeoutError';
}
function isCancellation(err) {
    if (!err)
        return false;
    if (err instanceof CancelledError)
        return true;
    const e = err;
    return (e.name === 'CancelledError' ||
        e.name === 'AbortError' ||
        e.message === exports.CANCELLED_MESSAGE);
}
function throwIfCancelled(signal) {
    if (signal?.aborted) {
        throw new CancelledError();
    }
}
function sleepWithSignal(ms, signal) {
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
function combineAbortSignals(...signals) {
    const active = signals.filter((s) => !!s);
    if (active.length === 0)
        return undefined;
    if (active.length === 1)
        return active[0];
    const anyFn = AbortSignal.any;
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
//# sourceMappingURL=cancellation.js.map