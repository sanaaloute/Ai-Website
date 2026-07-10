export declare class ModelResolverService {
    resolveSequence(nodeType: string): string[];
    resolve(nodeType: string): string;
    isAllowedModel(model?: string): boolean;
    private dedupe;
}
