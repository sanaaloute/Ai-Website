export declare class PromptLoaderService {
    private readonly logger;
    private readonly promptsDir;
    private readonly cache;
    private readonly cacheEnabled;
    constructor();
    load(name: string): Promise<string>;
    listAvailable(): string[];
}
