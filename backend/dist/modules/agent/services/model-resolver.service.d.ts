import { ProviderId } from "../../../lib/llm-providers";
export declare class ModelResolverService {
    resolveSequence(nodeType: string, providerId?: ProviderId): string[];
    resolve(nodeType: string, providerId?: ProviderId): string;
    isAllowedModel(model?: string): boolean;
    private dedupe;
}
