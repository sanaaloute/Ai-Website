export declare function pLimit(concurrency: number): <T>(fn: () => Promise<T>) => Promise<T>;
