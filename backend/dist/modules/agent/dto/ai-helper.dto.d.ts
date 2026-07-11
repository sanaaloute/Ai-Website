export declare class ChatDto {
    provider?: string;
    prompt: string;
}
export declare class AnalyzeEditIntentDto {
    prompt: string;
    manifest?: Record<string, unknown>;
}
export declare class CodeComponentDto {
    section: Record<string, unknown>;
    tokens?: Record<string, unknown>;
}
export declare class CodePageDto {
    page: Record<string, unknown>;
    sections?: Array<Record<string, unknown>>;
}
export declare class DesignTokensDto {
    spec?: Record<string, unknown>;
}
export declare class SummarizeSpecDto {
    prompt: string;
}
export declare class UiUxBlueprintDto {
    spec?: Record<string, unknown>;
}
export declare class FilePlanDto {
    spec?: Record<string, unknown>;
    blueprint?: Record<string, unknown>;
}
