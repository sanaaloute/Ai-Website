import { SearchPlan, FilePlanEntry, PromptContent } from "../types";
import { ToolDefinition, ToolCall } from "../modules/agent/tools/tool-definitions";
import type { ToolExecutionResult } from "../modules/agent/tools/tool-executor";
export declare class AiGatewayService {
    private readonly logger;
    private static readonly NON_STREAMING_LLM_TIMEOUT_MS;
    private static readonly VALIDATION_LLM_TIMEOUT_MS;
    private sleep;
    private createAbortSignal;
    chat(prompt: PromptContent, model: string | string[], apiKey?: string): AsyncGenerator<Record<string, unknown>>;
    chatCompletions(messages: Array<{
        role: string;
        content: string | unknown[];
    }>, model: string | string[], apiKey?: string): Promise<string>;
    chatCompletionsStream(messages: Array<{
        role: string;
        content: string | unknown[];
    }>, model: string | string[], apiKey?: string, onToken?: (token: string) => void | Promise<void>): Promise<string>;
    chatCompletionsWithToolsStream(messages: Array<{
        role: string;
        content: string | null;
        tool_call_id?: string;
        name?: string;
        tool_calls?: ToolCall[];
    }>, tools: ToolDefinition[], model: string | string[], apiKey?: string, onToken?: (token: string) => void | Promise<void>, onToolCall?: (toolCall: ToolCall) => Promise<ToolExecutionResult>, onFileStart?: (path: string) => void | Promise<void>): Promise<{
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
    }>, tools: ToolDefinition[], model: string | string[], apiKey?: string): Promise<{
        content: string | null;
        toolCalls: ToolCall[];
    }>;
    proxyChatCompletions(body: Record<string, unknown>, apiKey: string): Promise<Response>;
    validateApiKey(apiKey: string): Promise<{
        valid: boolean;
        warning: string | null;
    }>;
    analyzeEditIntent(prompt: PromptContent, manifest?: Record<string, unknown>, model?: string | string[], apiKey?: string): Promise<SearchPlan>;
    generateComponent(section: Record<string, unknown>, tokens?: Record<string, unknown>, model?: string | string[], apiKey?: string): Promise<{
        code: string;
    }>;
    generatePage(page: Record<string, unknown>, sections: Array<Record<string, unknown>>, model?: string | string[], apiKey?: string): Promise<{
        code: string;
    }>;
    designTokens(spec?: Record<string, unknown>, model?: string | string[], apiKey?: string): Promise<Record<string, unknown>>;
    summarizeSpec(prompt: PromptContent, model?: string | string[], apiKey?: string): Promise<Record<string, unknown>>;
    uiUxBlueprint(spec?: Record<string, unknown>, model?: string | string[], apiKey?: string): Promise<Record<string, unknown>>;
    filePlan(spec?: Record<string, unknown>, blueprint?: Record<string, unknown>, model?: string | string[], apiKey?: string): Promise<{
        files: FilePlanEntry[];
    }>;
    private buildMessages;
    private extractContent;
    private extractJson;
    private extractCodeBlock;
}
