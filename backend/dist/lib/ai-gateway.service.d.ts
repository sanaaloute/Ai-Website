import { SearchPlan, FilePlanEntry, PromptContent } from "../types";
import { ToolDefinition, ToolCall } from "../modules/agent/tools/tool-definitions";
import type { ToolExecutionResult } from "../modules/agent/tools/tool-executor";
import { AiKeyInput, ProviderId } from "./llm-providers";
export interface GenerationOptions {
    temperature?: number;
    maxTokens?: number;
    label?: string;
}
export declare class AiGatewayService {
    private readonly logger;
    private static readonly NON_STREAMING_LLM_TIMEOUT_MS;
    private static readonly VALIDATION_LLM_TIMEOUT_MS;
    private sleep;
    private createAbortSignal;
    private logUsage;
    private createStreamWatchdog;
    private normalizeCandidates;
    chat(prompt: PromptContent, model: string | string[], apiKey?: AiKeyInput): AsyncGenerator<Record<string, unknown>>;
    chatCompletions(messages: Array<{
        role: string;
        content: string | unknown[];
    }>, model: string | string[], apiKey?: AiKeyInput): Promise<string>;
    chatCompletionsStream(messages: Array<{
        role: string;
        content: string | unknown[];
    }>, model: string | string[], apiKey?: AiKeyInput, onToken?: (token: string) => void | Promise<void>, signal?: AbortSignal, opts?: GenerationOptions): Promise<string>;
    chatCompletionsWithToolsStream(messages: Array<{
        role: string;
        content: string | null;
        tool_call_id?: string;
        name?: string;
        tool_calls?: ToolCall[];
    }>, tools: ToolDefinition[], model: string | string[], apiKey?: AiKeyInput, onToken?: (token: string, kind: 'thinking' | 'code') => void | Promise<void>, onToolCall?: (toolCall: ToolCall) => Promise<ToolExecutionResult>, onFileStart?: (path: string) => void | Promise<void>, signal?: AbortSignal, opts?: GenerationOptions): Promise<{
        content: string | null;
        toolCalls: ToolCall[];
        toolResults: ToolExecutionResult[];
    }>;
    chatCompletionsWithTools(messages: Array<{
        role: string;
        content: string | null;
        tool_call_id?: string;
        name?: string;
        tool_calls?: ToolCall[];
    }>, tools: ToolDefinition[], model: string | string[], apiKey?: AiKeyInput): Promise<{
        content: string | null;
        toolCalls: ToolCall[];
    }>;
    proxyChatCompletions(body: Record<string, unknown>, apiKey: string): Promise<Response>;
    validateApiKey(apiKey: string, providerId?: ProviderId): Promise<{
        valid: boolean;
        warning: string | null;
        authFailure: boolean;
    }>;
    analyzeEditIntent(prompt: PromptContent, manifest?: Record<string, unknown>, model?: string | string[], apiKey?: AiKeyInput): Promise<SearchPlan>;
    generateComponent(section: Record<string, unknown>, tokens?: Record<string, unknown>, model?: string | string[], apiKey?: AiKeyInput): Promise<{
        code: string;
    }>;
    generatePage(page: Record<string, unknown>, sections: Array<Record<string, unknown>>, model?: string | string[], apiKey?: AiKeyInput): Promise<{
        code: string;
    }>;
    designTokens(spec?: Record<string, unknown>, model?: string | string[], apiKey?: AiKeyInput): Promise<Record<string, unknown>>;
    summarizeSpec(prompt: PromptContent, model?: string | string[], apiKey?: AiKeyInput): Promise<Record<string, unknown>>;
    uiUxBlueprint(spec?: Record<string, unknown>, model?: string | string[], apiKey?: AiKeyInput): Promise<Record<string, unknown>>;
    filePlan(spec?: Record<string, unknown>, blueprint?: Record<string, unknown>, model?: string | string[], apiKey?: AiKeyInput): Promise<{
        files: FilePlanEntry[];
    }>;
    private buildMessages;
    private extractContent;
    private extractJson;
    private extractCodeBlock;
}
