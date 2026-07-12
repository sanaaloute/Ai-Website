import { Injectable, Logger } from '@nestjs/common';
import { env } from '@/config/env';
import { SearchPlan, FilePlanEntry, PromptContent, normalizePromptContent, promptToString, buildPromptContent } from '@/types';
import { ToolDefinition, ToolCall } from '@/modules/agent/tools/tool-definitions';
import type { ToolExecutionResult } from '@/modules/agent/tools/tool-executor';
import { AiCredential, AiKeyInput, ProviderId, getProvider } from '@/lib/llm-providers';

/** A concrete request target: one provider + key + the models to try on it. */
interface AiCandidate {
  provider: ProviderId;
  apiKey: string;
  baseUrl: string;
  extraHeaders?: Record<string, string>;
  models: string[];
}

interface ExtractedChunk {
  code?: string;
  path?: string;
}

/**
 * Extracts the code content and file path from a partial JSON tool-arguments
 * string incrementally. This lets us stream just the code being written, and
 * announce the target file, instead of raw JSON to the frontend.
 */
class CodeContentExtractor {
  private buffer = '';
  private emittedCodeLength = 0;
  private inCodeField = false;
  private pathEmitted = false;

  append(argumentsChunk: string): ExtractedChunk {
    this.buffer += argumentsChunk;
    const result: ExtractedChunk = {};

    // Try to announce the target file as soon as its path appears.
    if (!this.pathEmitted) {
      const pathMatch = this.buffer.match(/"(path|file_path)"\s*:\s*"([^"]*)"/);
      if (pathMatch) {
        try {
          result.path = JSON.parse(`"${pathMatch[2]}"`) as string;
          this.pathEmitted = true;
        } catch {
          // Partial escape — wait for more chunks.
        }
      }
    }

    if (!this.inCodeField) {
      // Look for the start of a code-bearing field: "content":"...
      const match = this.buffer.match(/"(content|newText|replace|new_string)"\s*:\s*"(.*)$/s);
      if (!match) return result;
      this.inCodeField = true;
      this.buffer = match[2];
      this.emittedCodeLength = 0;
    }

    // Find the end of the JSON string: an unescaped quote followed by , or }
    // This regex is intentionally conservative; it may miss the exact end if
    // escaped quotes are present, but the next chunk will correct it.
    const endMatch = this.buffer.match(/(?<!\\)"(?=,|})/);
    const candidate = endMatch ? this.buffer.slice(0, endMatch.index) : this.buffer;

    try {
      // JSON.parse expects the string to be wrapped in quotes.
      const unescaped = JSON.parse(`"${candidate}"`) as string;
      if (unescaped.length > this.emittedCodeLength) {
        const next = unescaped.slice(this.emittedCodeLength);
        this.emittedCodeLength = unescaped.length;
        result.code = next;
      }
    } catch {
      // Partial escape sequence or incomplete string — wait for more chunks.
    }
    return result;
  }
}

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);

  private static readonly NON_STREAMING_LLM_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
  private static readonly VALIDATION_LLM_TIMEOUT_MS = 30 * 1000; // 30 seconds

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private createAbortSignal(timeoutMs: number): AbortSignal {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    // Prevent unhandled abort errors from keeping the process alive
    controller.signal.addEventListener('abort', () => clearTimeout(timeout), { once: true });
    return controller.signal;
  }

  /**
   * Normalize the (model, apiKey) pair into an ordered list of request
   * candidates. When the caller passes several credentials (the user's
   * providers, active first), each credential becomes a candidate and the
   * retry loops fall through them in order — that is the cross-provider
   * fallback. A plain string key (or no key) targets the legacy TokenFree
   * gateway, preserving the previous behavior.
   *
   * The caller's model list is intersected with each provider's approved
   * models; when nothing matches (e.g. TokenFree model names sent to an
   * OpenAI candidate), the provider's own default models are used.
   */
  private normalizeCandidates(model: string | string[], apiKey?: AiKeyInput): AiCandidate[] {
    const models = Array.isArray(model) ? model : [model];
    const creds: AiCredential[] = !apiKey
      ? []
      : typeof apiKey === 'string'
        ? [{ provider: 'tokenfree', apiKey }]
        : Array.isArray(apiKey)
          ? apiKey
          : [apiKey];
    if (creds.length === 0) creds.push({ provider: 'tokenfree', apiKey: '' });

    return creds.map((cred) => {
      const provider = getProvider(cred.provider);
      const intersection = models.filter((m) => provider.models.includes(m));
      return {
        provider: cred.provider,
        apiKey: cred.apiKey,
        baseUrl: provider.baseUrl,
        extraHeaders: provider.extraHeaders,
        models: intersection.length > 0 ? intersection : provider.models,
      };
    });
  }

  async *chat(
    prompt: PromptContent,
    model: string | string[],
    apiKey?: AiKeyInput,
  ): AsyncGenerator<Record<string, unknown>> {
    const candidates = this.normalizeCandidates(model, apiKey);

    const errors: string[] = [];

    for (const candidate of candidates) {
      const url = `${candidate.baseUrl}/chat/completions`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidate.apiKey}`,
        Accept: 'text/event-stream',
        ...candidate.extraHeaders,
      };

      for (const [i, m] of candidate.models.entries()) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: m,
            messages: [{ role: 'user', content: normalizePromptContent(prompt) }],
            stream: true,
            temperature: 0.7,
          }),
        });

        if (!res.ok || !res.body) {
          const text = await res.text();
          errors.push(`${candidate.provider}/${m}: ${text.slice(0, 200)}`);
          if (res.status === 503 || res.status === 429) {
            await this.sleep(500 * (i + 1));
          }
          continue;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              const content = delta?.content;
              if (typeof content === 'string' && content.length > 0) {
                yield { content };
              }
            } catch {
              // Ignore malformed SSE chunks
            }
          }
        }

        // Stream completed successfully; do not try fallback models.
        return;
      } catch (err) {
        errors.push(`${candidate.provider}/${m}: ${err instanceof Error ? err.message : String(err)}`);
      }
      }
    }

    throw new Error(`All chat models failed: ${errors.join('; ')}`);
  }

  async chatCompletions(
    messages: Array<{ role: string; content: string | unknown[] }>,
    model: string | string[],
    apiKey?: AiKeyInput,
  ): Promise<string> {
    const candidates = this.normalizeCandidates(model, apiKey);

    const errors: string[] = [];

    for (const candidate of candidates) {
      const url = `${candidate.baseUrl}/chat/completions`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidate.apiKey}`,
        ...candidate.extraHeaders,
      };

      for (const [i, m] of candidate.models.entries()) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          signal: this.createAbortSignal(AiGatewayService.NON_STREAMING_LLM_TIMEOUT_MS),
          body: JSON.stringify({
            model: m,
            messages,
            stream: false,
            temperature: 0.7,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          errors.push(`${candidate.provider}/${m}: HTTP ${res.status} ${text.slice(0, 200)}`);
          this.logger.warn(`chatCompletions model ${candidate.provider}/${m} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
          if (res.status === 503 || res.status === 429) {
            await this.sleep(500 * (i + 1));
          }
          continue;
        }

        const text = await res.text();
        return this.extractContent(text) || text;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${candidate.provider}/${m}: ${msg}`);
        this.logger.warn(`chatCompletions model ${candidate.provider}/${m} error: ${msg}`);
      }
      }
    }

    this.logger.error(`All chatCompletions models failed: ${errors.join('; ')}`);
    throw new Error(`All models failed: ${errors.join('; ')}`);
  }

  async chatCompletionsStream(
    messages: Array<{ role: string; content: string | unknown[] }>,
    model: string | string[],
    apiKey?: AiKeyInput,
    onToken?: (token: string) => void | Promise<void>,
  ): Promise<string> {
    const candidates = this.normalizeCandidates(model, apiKey);

    const errors: string[] = [];

    for (const candidate of candidates) {
      const url = `${candidate.baseUrl}/chat/completions`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidate.apiKey}`,
        Accept: 'text/event-stream',
        ...candidate.extraHeaders,
      };

      for (const [i, m] of candidate.models.entries()) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: m,
            messages,
            stream: true,
            temperature: 0.7,
          }),
        });

        if (!res.ok || !res.body) {
          const text = await res.text();
          errors.push(`${candidate.provider}/${m}: HTTP ${res.status} ${text.slice(0, 200)}`);
          this.logger.warn(`chatCompletionsStream model ${candidate.provider}/${m} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
          if (res.status === 503 || res.status === 429) {
            await this.sleep(500 * (i + 1));
          }
          continue;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content;
              if (typeof token === 'string') {
                fullText += token;
                if (onToken) {
                  try {
                    await onToken(token);
                  } catch (tokenErr) {
                    this.logger.warn(`chatCompletionsStream onToken error: ${tokenErr instanceof Error ? tokenErr.message : String(tokenErr)}`);
                  }
                }
              }
            } catch {
              // Ignore malformed SSE chunks
            }
          }
        }

        return fullText;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${candidate.provider}/${m}: ${msg}`);
        this.logger.warn(`chatCompletionsStream model ${candidate.provider}/${m} error: ${msg}`);
      }
      }
    }

    this.logger.error(`All chatCompletionsStream models failed: ${errors.join('; ')}`);
    throw new Error(`All models failed: ${errors.join('; ')}`);
  }

  async chatCompletionsWithToolsStream(
    messages: Array<{ role: string; content: string | null; tool_call_id?: string; name?: string; tool_calls?: ToolCall[] }>,
    tools: ToolDefinition[],
    model: string | string[],
    apiKey?: AiKeyInput,
    onToken?: (token: string) => void | Promise<void>,
    onToolCall?: (toolCall: ToolCall) => Promise<ToolExecutionResult>,
    onFileStart?: (path: string) => void | Promise<void>,
  ): Promise<{ content: string | null; toolCalls: ToolCall[]; toolResults: ToolExecutionResult[] }> {
    const candidates = this.normalizeCandidates(model, apiKey);

    const errors: string[] = [];

    for (const candidate of candidates) {
      const url = `${candidate.baseUrl}/chat/completions`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidate.apiKey}`,
        Accept: 'text/event-stream',
        ...candidate.extraHeaders,
      };

      for (const [i, m] of candidate.models.entries()) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: m,
            messages,
            tools,
            tool_choice: 'auto',
            stream: true,
            temperature: 0.3,
          }),
        });

        if (!res.ok || !res.body) {
          const text = await res.text();
          errors.push(`${candidate.provider}/${m}: HTTP ${res.status} ${text.slice(0, 200)}`);
          this.logger.warn(`chatCompletionsWithToolsStream model ${candidate.provider}/${m} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
          if (res.status === 503 || res.status === 429) {
            await this.sleep(500 * (i + 1));
          }
          continue;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let content = '';
        const toolCallsAccum: Record<number, { id?: string; type?: string; name?: string; arguments?: string }> = {};
        const codeExtractors: Record<number, CodeContentExtractor> = {};
        let currentToolIndex = -1;
        let currentToolName = '';
        const toolResults: ToolExecutionResult[] = [];
        const codeWritingTools = new Set(['write_file', 'edit_file', 'search_replace']);

        const finalizeToolCall = async (idx: number): Promise<void> => {
          const accum = toolCallsAccum[idx];
          if (!accum || !accum.id || accum.type !== 'function' || !accum.name) {
            return;
          }
          const toolCall: ToolCall = {
            id: accum.id,
            type: 'function',
            function: {
              name: accum.name,
              arguments: accum.arguments ?? '',
            },
          };
          if (onToolCall) {
            try {
              const result = await onToolCall(toolCall);
              toolResults.push(result);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              this.logger.warn(`onToolCall error for ${toolCall.function.name}: ${msg}`);
              toolResults.push({
                toolCallId: toolCall.id,
                name: toolCall.function.name,
                content: `Error: ${msg}`,
                success: false,
              });
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              if (typeof delta?.content === 'string') {
                content += delta.content;
                if (onToken) {
                  try {
                    await onToken(delta.content);
                  } catch (tokenErr) {
                    this.logger.warn(`chatCompletionsWithToolsStream onToken error: ${tokenErr instanceof Error ? tokenErr.message : String(tokenErr)}`);
                  }
                }
              }

              if (Array.isArray(delta?.tool_calls)) {
                for (const tc of delta.tool_calls as Array<{
                  index?: number;
                  id?: string;
                  type?: string;
                  function?: { name?: string; arguments?: string };
                }>) {
                  const idx = typeof tc.index === 'number' ? tc.index : 0;
                  if (idx !== currentToolIndex) {
                    if (currentToolIndex >= 0) {
                      await finalizeToolCall(currentToolIndex);
                    }
                    currentToolIndex = idx;
                    currentToolName = tc.function?.name || '';
                    if (!codeExtractors[idx]) {
                      codeExtractors[idx] = new CodeContentExtractor();
                    }
                  }
                  if (!toolCallsAccum[idx]) {
                    toolCallsAccum[idx] = {};
                  }
                  const accum = toolCallsAccum[idx];
                  if (tc.id) accum.id = tc.id;
                  if (tc.type) accum.type = tc.type;
                  if (tc.function?.name) {
                    accum.name = tc.function.name;
                    currentToolName = tc.function.name;
                  }
                  if (typeof tc.function?.arguments === 'string') {
                    // Stream code-writing tool arguments so the frontend can show
                    // code being generated in real time. We extract just the code
                    // content (not the surrounding JSON) before forwarding tokens.
                    if (codeWritingTools.has(currentToolName)) {
                      const extractor = codeExtractors[idx] ?? new CodeContentExtractor();
                      codeExtractors[idx] = extractor;
                      const { code: codeToken, path: filePath } = extractor.append(tc.function.arguments);
                      if (filePath && onFileStart) {
                        try {
                          await onFileStart(filePath);
                        } catch (startErr) {
                          this.logger.warn(`chatCompletionsWithToolsStream onFileStart error: ${startErr instanceof Error ? startErr.message : String(startErr)}`);
                        }
                      }
                      if (codeToken && onToken) {
                        try {
                          // If the model sent a large chunk at once, split it so the
                          // frontend renders incrementally instead of jumping.
                          const CHUNK_SIZE = 80;
                          if (codeToken.length <= CHUNK_SIZE) {
                            await onToken(codeToken);
                          } else {
                            for (let i = 0; i < codeToken.length; i += CHUNK_SIZE) {
                              await onToken(codeToken.slice(i, i + CHUNK_SIZE));
                              // Yield to the event loop so the network stack can
                              // flush the SSE chunk to the frontend.
                              await this.sleep(0);
                            }
                          }
                        } catch (tokenErr) {
                          this.logger.warn(`chatCompletionsWithToolsStream onToken error: ${tokenErr instanceof Error ? tokenErr.message : String(tokenErr)}`);
                        }
                      }
                    }
                    accum.arguments = (accum.arguments ?? '') + tc.function.arguments;
                  }
                }
              }
            } catch {
              // Ignore malformed SSE chunks
            }
          }
        }

        if (currentToolIndex >= 0) {
          await finalizeToolCall(currentToolIndex);
        }

        const toolCalls: ToolCall[] = Object.values(toolCallsAccum)
          .filter((tc) => tc.id && tc.type === 'function' && tc.name)
          .map((tc) => ({
            id: tc.id as string,
            type: 'function',
            function: {
              name: tc.name as string,
              arguments: tc.arguments ?? '',
            },
          }));

        return { content: content || null, toolCalls, toolResults };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${candidate.provider}/${m}: ${msg}`);
        this.logger.warn(`chatCompletionsWithToolsStream model ${candidate.provider}/${m} error: ${msg}`);
      }
      }
    }

    this.logger.error(`All chatCompletionsWithToolsStream models failed: ${errors.join('; ')}`);
    throw new Error(`All models failed: ${errors.join('; ')}`);
  }

  async chatCompletionsWithTools(
    messages: Array<{ role: string; content: string | null; tool_call_id?: string; name?: string; tool_calls?: ToolCall[] }>,
    tools: ToolDefinition[],
    model: string | string[],
    apiKey?: AiKeyInput,
  ): Promise<{ content: string | null; toolCalls: ToolCall[] }> {
    const candidates = this.normalizeCandidates(model, apiKey);

    const errors: string[] = [];

    for (const candidate of candidates) {
      const url = `${candidate.baseUrl}/chat/completions`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidate.apiKey}`,
        ...candidate.extraHeaders,
      };

      for (const [i, m] of candidate.models.entries()) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          signal: this.createAbortSignal(AiGatewayService.NON_STREAMING_LLM_TIMEOUT_MS),
          body: JSON.stringify({
            model: m,
            messages,
            tools,
            tool_choice: 'auto',
            stream: false,
            temperature: 0.3,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          errors.push(`${candidate.provider}/${m}: HTTP ${res.status} ${text.slice(0, 200)}`);
          this.logger.warn(`chatCompletionsWithTools model ${candidate.provider}/${m} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
          if (res.status === 503 || res.status === 429) {
            await this.sleep(500 * (i + 1));
          }
          continue;
        }

        const data = await res.json();
        const message = data.choices?.[0]?.message;
        const content = message?.content ?? null;
        const toolCalls = Array.isArray(message?.tool_calls)
          ? (message.tool_calls as ToolCall[]).filter((tc) => tc.type === 'function')
          : [];
        return { content, toolCalls };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${candidate.provider}/${m}: ${msg}`);
        this.logger.warn(`chatCompletionsWithTools model ${candidate.provider}/${m} error: ${msg}`);
      }
      }
    }

    this.logger.error(`All chatCompletionsWithTools models failed: ${errors.join('; ')}`);
    throw new Error(`All models failed: ${errors.join('; ')}`);
  }

  async proxyChatCompletions(body: Record<string, unknown>, apiKey: string): Promise<Response> {
    const e = env();
    const url = `${e.aiBaseUrl}/chat/completions`;
    try {
      return await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,

        },
        signal: this.createAbortSignal(AiGatewayService.NON_STREAMING_LLM_TIMEOUT_MS),
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(`proxyChatCompletions error: ${err instanceof Error ? err.message : String(err)}`);
      return new Response(JSON.stringify({ error: 'AI gateway unavailable' }), { status: 503 });
    }
  }

  async validateApiKey(apiKey: string, providerId: ProviderId = 'tokenfree'): Promise<{ valid: boolean; warning: string | null; authFailure: boolean }> {
    const provider = getProvider(providerId);
    // Try the configured default model first (TokenFree only), then fall back through the provider's approved models.
    const models = providerId === 'tokenfree'
      ? Array.from(new Set([env().aiDefaultModel, ...provider.models].filter(Boolean)))
      : provider.models;
    const errors: string[] = [];
    const statuses: number[] = [];
    for (const [i, model] of models.entries()) {
      try {
        const res = await fetch(`${provider.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...provider.extraHeaders },
          signal: this.createAbortSignal(AiGatewayService.VALIDATION_LLM_TIMEOUT_MS),
          body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 }),
        });
        if (res.ok) return { valid: true, warning: null, authFailure: false };
        statuses.push(res.status);
        const text = await res.text();
        errors.push(`${model}: ${res.status} ${text.slice(0, 120)}`);
        if (res.status === 503 || res.status === 429) {
          await this.sleep(500 * (i + 1));
        }
      } catch (err) {
        errors.push(`${model}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    // When every model rejected the key with 401/403 the key itself is
    // definitively invalid. Anything else (5xx, timeouts, network errors) is
    // treated as a transient gateway problem so callers can avoid blocking
    // users during an upstream outage.
    const authFailure =
      statuses.length === models.length && statuses.every((s) => s === 401 || s === 403);
    return { valid: false, warning: `AI gateway validation failed: ${errors.join('; ')}`, authFailure };
  }

  async analyzeEditIntent(
    prompt: PromptContent,
    manifest?: Record<string, unknown>,
    model: string | string[] = env().aiDefaultModel,
    apiKey?: AiKeyInput,
  ): Promise<SearchPlan> {
    const system = `You are a code search planner. Given the user's edit request and an optional project manifest, produce a JSON search plan.

Output format (JSON only):
{
  "edit_type": "style|content|component|structure",
  "reasoning": "brief reasoning",
  "search_terms": ["term1", "term2"],
  "regex_patterns": ["regex1"],
  "file_types_to_search": [".tsx", ".css"],
  "expected_matches": 3,
  "fallback_search": "term"
}`;
    const user = buildPromptContent(`Request: `, prompt);
    const text = await this.chatCompletions(this.buildMessages(system, user), model, apiKey);
    const parsed = this.extractJson(text) as Record<string, unknown> | null;
    if (parsed && typeof parsed === 'object' && 'edit_type' in parsed) {
      return {
        edit_type: String(parsed.edit_type ?? 'content'),
        reasoning: String(parsed.reasoning ?? `User wants to: ${prompt}`),
        search_terms: Array.isArray(parsed.search_terms) ? parsed.search_terms.map(String) : promptToString(prompt).split(' ').slice(0, 4),
        regex_patterns: Array.isArray(parsed.regex_patterns) ? parsed.regex_patterns.map(String) : ['[A-Za-z]+'],
        file_types_to_search: Array.isArray(parsed.file_types_to_search) ? parsed.file_types_to_search.map(String) : ['.tsx', '.css'],
        expected_matches: typeof parsed.expected_matches === 'number' ? parsed.expected_matches : 3,
        fallback_search: String(parsed.fallback_search ?? promptToString(prompt)),
      };
    }
    return {
      edit_type: promptToString(prompt).toLowerCase().includes('color') ? 'style' : 'content',
      reasoning: `User wants to: ${promptToString(prompt)}`,
      search_terms: promptToString(prompt).split(' ').slice(0, 4),
      regex_patterns: ['[A-Za-z]+'],
      file_types_to_search: ['.tsx', '.css'],
      expected_matches: 3,
      fallback_search: promptToString(prompt),
    };
  }

  async generateComponent(
    section: Record<string, unknown>,
    tokens?: Record<string, unknown>,
    model: string | string[] = env().aiDefaultModel,
    apiKey?: AiKeyInput,
  ): Promise<{ code: string }> {
    const system = `You are a React + TypeScript expert. Generate a single self-contained functional component using Tailwind CSS.
Return only the code inside a TypeScript code block (tsx). No explanations.`;
    const user = `Section: ${JSON.stringify(section)}\n\nDesign tokens: ${JSON.stringify(tokens ?? {})}`;
    const text = await this.chatCompletions(this.buildMessages(system, user), model, apiKey);
    const code = this.extractCodeBlock(text) || text.trim();
    return { code };
  }

  async generatePage(
    page: Record<string, unknown>,
    sections: Array<Record<string, unknown>>,
    model: string | string[] = env().aiDefaultModel,
    apiKey?: AiKeyInput,
  ): Promise<{ code: string }> {
    const system = `You are a React + TypeScript expert. Generate a single Next.js/React page component that imports and renders the provided sections.
Return only the code inside a TypeScript code block (tsx). No explanations.`;
    const user = `Page: ${JSON.stringify(page)}\n\nSections: ${JSON.stringify(sections ?? [])}`;
    const text = await this.chatCompletions(this.buildMessages(system, user), model, apiKey);
    const code = this.extractCodeBlock(text) || text.trim();
    return { code };
  }

  async designTokens(
    spec?: Record<string, unknown>,
    model: string | string[] = env().aiDefaultModel,
    apiKey?: AiKeyInput,
  ): Promise<Record<string, unknown>> {
    const system = `You are a design-system expert. Given a brand spec, return a JSON design-tokens object with this shape:
{
  "theme": "string",
  "colors": { "primary": "#hex", "secondary": "#hex", "background": "#hex", "text": "#hex" },
  "radius": { "sm": "string", "md": "string", "lg": "string" },
  "shadows": { "sm": "string", "md": "string", "lg": "string" },
  "typography": { "heading": "string", "body": "string" }
}
Return JSON only.`;
    const user = `Spec: ${JSON.stringify(spec ?? {})}`;
    const text = await this.chatCompletions(this.buildMessages(system, user), model, apiKey);
    const parsed = this.extractJson(text) as Record<string, unknown> | null;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return {
      theme: (spec?.brand as string)?.toLowerCase() ?? 'default',
      colors: { primary: '#3b82f6', secondary: '#64748b', background: '#ffffff', text: '#111827' },
      radius: { sm: '0.25rem', md: '0.5rem', lg: '1rem' },
      shadows: { sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)', md: '0 4px 6px -1px rgb(0 0 0 / 0.1)', lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)' },
      typography: { heading: 'Inter, sans-serif', body: 'Inter, sans-serif' },
    };
  }

  async summarizeSpec(
    prompt: PromptContent,
    model: string | string[] = env().aiDefaultModel,
    apiKey?: AiKeyInput,
  ): Promise<Record<string, unknown>> {
    const system = `You are a product manager. Summarize the user's website request into a JSON spec with this exact shape:
{
  "project_type": "web_app|landing_page|blog|ecommerce",
  "title": "string",
  "tagline": "string",
  "target_audience": "string",
  "core_features": ["feature1"],
  "pages": [{ "name": "Home", "route": "/" }],
  "brand_tone": "string",
  "color_preferences": "string",
  "constraints": []
}
Return JSON only.`;
    const user = buildPromptContent(`Request: `, prompt);
    const text = await this.chatCompletions(this.buildMessages(system, user), model, apiKey);
    const parsed = this.extractJson(text) as Record<string, unknown> | null;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return {
      project_type: 'web_app',
      title: promptToString(prompt).slice(0, 40),
      tagline: 'Generated by AI-Website',
      target_audience: 'developers',
      core_features: ['landing page', 'contact form'],
      pages: [{ name: 'Home', route: '/' }],
      brand_tone: 'professional',
      color_preferences: 'modern',
      constraints: [],
    };
  }

  async uiUxBlueprint(
    spec?: Record<string, unknown>,
    model: string | string[] = env().aiDefaultModel,
    apiKey?: AiKeyInput,
  ): Promise<Record<string, unknown>> {
    const system = `You are a UX architect. Given a project spec, return a JSON blueprint with this shape:
{
  "pages": [
    { "name": "Home", "sections": [{ "name": "Hero", "type": "hero" }] }
  ]
}
Return JSON only.`;
    const user = `Spec: ${JSON.stringify(spec ?? {})}`;
    const text = await this.chatCompletions(this.buildMessages(system, user), model, apiKey);
    const parsed = this.extractJson(text) as Record<string, unknown> | null;
    if (parsed && typeof parsed === 'object' && 'pages' in parsed) {
      return parsed;
    }
    const pages = (spec?.pages as number) ?? 1;
    return {
      pages: Array.from({ length: pages }).map((_, i) => ({
        name: i === 0 ? 'Home' : `Page ${i + 1}`,
        sections: [{ name: 'Hero', type: 'hero' }],
      })),
    };
  }

  async filePlan(
    spec?: Record<string, unknown>,
    blueprint?: Record<string, unknown>,
    model: string | string[] = env().aiDefaultModel,
    apiKey?: AiKeyInput,
  ): Promise<{ files: FilePlanEntry[] }> {
    const system = `You are a software architect. Given a project spec and UI blueprint, produce a JSON file plan with this exact shape:
{
  "files": [
    { "path": "src/App.tsx", "purpose": "Main entry" }
  ]
}
Return JSON only.`;
    const user = `Spec: ${JSON.stringify(spec ?? {})}\n\nBlueprint: ${JSON.stringify(blueprint ?? {})}`;
    const text = await this.chatCompletions(this.buildMessages(system, user), model, apiKey);
    const parsed = this.extractJson(text) as Record<string, unknown> | null;
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.files)) {
      return {
        files: parsed.files
          .filter((f: unknown) => f && typeof f === 'object' && 'path' in (f as object))
          .map((f: unknown) => ({ path: String((f as FilePlanEntry).path), purpose: String((f as FilePlanEntry).purpose ?? '') })),
      };
    }
    const title = (spec?.title as string) ?? 'Project';
    const pages = ((blueprint?.pages as Record<string, unknown>[]) ?? []).map((p) => String(p.name));
    return {
      files: [
        { path: 'src/App.tsx', purpose: `Main entry for ${title}` },
        ...pages.map((name) => ({ path: `src/pages/${name}.tsx`, purpose: `${name} page` })),
      ],
    };
  }

  private buildMessages(
    system: string,
    user: PromptContent,
  ): Array<{ role: string; content: string | unknown[] }> {
    return [
      { role: 'system', content: system },
      { role: 'user', content: normalizePromptContent(user) },
    ];
  }

  private extractContent(text: string): string | null {
    if (!text || !text.trim().startsWith('{')) return null;
    try {
      const data = JSON.parse(text);
      const choices = data.choices;
      if (Array.isArray(choices) && choices.length > 0) {
        const message = choices[0].message;
        if (message?.content) return message.content;
        const delta = choices[0].delta;
        if (delta?.content) return delta.content;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private extractJson(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      // fall through
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // fall through
      }
    }
    return null;
  }

  private extractCodeBlock(text: string): string | null {
    const match = text.match(/```(?:tsx?|jsx?|javascript|typescript)?\n?([\s\S]*?)\n?```/);
    return match ? match[1].trim() : null;
  }
}
