import { ProviderId } from "../../../lib/llm-providers";
export declare class ModelResolverService {
    private readonly logger;
    private readonly warned;
    resolveSequence(nodeType: string, providerId?: ProviderId): string[];
    resolve(nodeType: string, providerId?: ProviderId): string;
    generationParams(nodeType: string): {
        temperature: number;
        maxTokens?: number;
        label: string;
    };
    isAllowedModel(model?: string): boolean;
    private warnOnce;
    private dedupe;
}
