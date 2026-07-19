export type ProviderId = 'tokenfree' | 'openai' | 'openrouter' | 'groq' | 'ollama_cloud' | 'kie_ai';
export interface LlmProvider {
    id: ProviderId;
    label: string;
    baseUrl: string;
    keySiteUrl: string;
    models: string[];
    extraHeaders?: Record<string, string>;
}
export declare function listProviders(): LlmProvider[];
export declare function isProviderId(value: unknown): value is ProviderId;
export declare function getProvider(id: ProviderId): LlmProvider;
export declare function providerModels(id: ProviderId): string[];
export interface AiCredential {
    provider: ProviderId;
    apiKey: string;
}
export type AiKeyInput = string | AiCredential | AiCredential[];
export declare function previewKey(key: string): string;
