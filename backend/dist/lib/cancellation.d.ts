export declare const CANCELLED_MESSAGE = "Cancelled by user";
export declare class CancelledError extends Error {
    constructor(message?: string);
}
export declare function isCancellation(err: unknown): boolean;
export declare function throwIfCancelled(signal?: AbortSignal | null): void;
export declare function sleepWithSignal(ms: number, signal?: AbortSignal | null): Promise<void>;
export declare function combineAbortSignals(...signals: Array<AbortSignal | undefined | null>): AbortSignal | undefined;
