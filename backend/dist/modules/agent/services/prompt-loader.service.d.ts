export declare class PromptLoaderService {
    private readonly logger;
    private readonly promptsDir;
    constructor();
    load(name: string): Promise<string>;
    listAvailable(): string[];
}
