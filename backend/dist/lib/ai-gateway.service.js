"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AiGatewayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiGatewayService = void 0;
const common_1 = require("@nestjs/common");
const env_1 = require("../config/env");
const types_1 = require("../types");
class CodeContentExtractor {
    constructor() {
        this.buffer = '';
        this.emittedCodeLength = 0;
        this.inCodeField = false;
        this.pathEmitted = false;
    }
    append(argumentsChunk) {
        this.buffer += argumentsChunk;
        const result = {};
        if (!this.pathEmitted) {
            const pathMatch = this.buffer.match(/"(path|file_path)"\s*:\s*"([^"]*)"/);
            if (pathMatch) {
                try {
                    result.path = JSON.parse(`"${pathMatch[2]}"`);
                    this.pathEmitted = true;
                }
                catch {
                }
            }
        }
        if (!this.inCodeField) {
            const match = this.buffer.match(/"(content|newText|replace|new_string)"\s*:\s*"(.*)$/s);
            if (!match)
                return result;
            this.inCodeField = true;
            this.buffer = match[2];
            this.emittedCodeLength = 0;
        }
        const endMatch = this.buffer.match(/(?<!\\)"(?=,|})/);
        const candidate = endMatch ? this.buffer.slice(0, endMatch.index) : this.buffer;
        try {
            const unescaped = JSON.parse(`"${candidate}"`);
            if (unescaped.length > this.emittedCodeLength) {
                const next = unescaped.slice(this.emittedCodeLength);
                this.emittedCodeLength = unescaped.length;
                result.code = next;
            }
        }
        catch {
        }
        return result;
    }
}
let AiGatewayService = AiGatewayService_1 = class AiGatewayService {
    constructor() {
        this.logger = new common_1.Logger(AiGatewayService_1.name);
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    createAbortSignal(timeoutMs) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        controller.signal.addEventListener('abort', () => clearTimeout(timeout), { once: true });
        return controller.signal;
    }
    async *chat(prompt, model, apiKey) {
        const models = Array.isArray(model) ? model : [model];
        const e = (0, env_1.env)();
        const url = `${e.aiBaseUrl}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey ?? ''}`,
            Accept: 'text/event-stream',
        };
        const errors = [];
        for (const [i, m] of models.entries()) {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        model: m,
                        messages: [{ role: 'user', content: (0, types_1.normalizePromptContent)(prompt) }],
                        stream: true,
                        temperature: 0.7,
                    }),
                });
                if (!res.ok || !res.body) {
                    const text = await res.text();
                    errors.push(`${m}: ${text.slice(0, 200)}`);
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
                    if (done)
                        break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed.startsWith(':'))
                            continue;
                        if (!trimmed.startsWith('data:'))
                            continue;
                        const data = trimmed.slice(5).trim();
                        if (data === '[DONE]')
                            return;
                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta;
                            const content = delta?.content;
                            if (typeof content === 'string' && content.length > 0) {
                                yield { content };
                            }
                        }
                        catch {
                        }
                    }
                }
                return;
            }
            catch (err) {
                errors.push(`${m}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        throw new Error(`All chat models failed: ${errors.join('; ')}`);
    }
    async chatCompletions(messages, model, apiKey) {
        const models = Array.isArray(model) ? model : [model];
        const e = (0, env_1.env)();
        const url = `${e.aiBaseUrl}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey ?? ''}`,
        };
        const errors = [];
        for (const [i, m] of models.entries()) {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers,
                    signal: this.createAbortSignal(AiGatewayService_1.NON_STREAMING_LLM_TIMEOUT_MS),
                    body: JSON.stringify({
                        model: m,
                        messages,
                        stream: false,
                        temperature: 0.7,
                    }),
                });
                if (!res.ok) {
                    const text = await res.text();
                    errors.push(`${m}: HTTP ${res.status} ${text.slice(0, 200)}`);
                    this.logger.warn(`chatCompletions model ${m} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
                    if (res.status === 503 || res.status === 429) {
                        await this.sleep(500 * (i + 1));
                    }
                    continue;
                }
                const text = await res.text();
                return this.extractContent(text) || text;
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                errors.push(`${m}: ${msg}`);
                this.logger.warn(`chatCompletions model ${m} error: ${msg}`);
            }
        }
        this.logger.error(`All chatCompletions models failed: ${errors.join('; ')}`);
        throw new Error(`All models failed: ${errors.join('; ')}`);
    }
    async chatCompletionsStream(messages, model, apiKey, onToken) {
        const models = Array.isArray(model) ? model : [model];
        const e = (0, env_1.env)();
        const url = `${e.aiBaseUrl}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey ?? ''}`,
            Accept: 'text/event-stream',
        };
        const errors = [];
        for (const [i, m] of models.entries()) {
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
                    errors.push(`${m}: HTTP ${res.status} ${text.slice(0, 200)}`);
                    this.logger.warn(`chatCompletionsStream model ${m} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
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
                    if (done)
                        break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed.startsWith(':'))
                            continue;
                        if (!trimmed.startsWith('data:'))
                            continue;
                        const data = trimmed.slice(5).trim();
                        if (data === '[DONE]')
                            continue;
                        try {
                            const parsed = JSON.parse(data);
                            const token = parsed.choices?.[0]?.delta?.content;
                            if (typeof token === 'string') {
                                fullText += token;
                                if (onToken) {
                                    try {
                                        await onToken(token);
                                    }
                                    catch (tokenErr) {
                                        this.logger.warn(`chatCompletionsStream onToken error: ${tokenErr instanceof Error ? tokenErr.message : String(tokenErr)}`);
                                    }
                                }
                            }
                        }
                        catch {
                        }
                    }
                }
                return fullText;
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                errors.push(`${m}: ${msg}`);
                this.logger.warn(`chatCompletionsStream model ${m} error: ${msg}`);
            }
        }
        this.logger.error(`All chatCompletionsStream models failed: ${errors.join('; ')}`);
        throw new Error(`All models failed: ${errors.join('; ')}`);
    }
    async chatCompletionsWithToolsStream(messages, tools, model, apiKey, onToken, onToolCall, onFileStart) {
        const models = Array.isArray(model) ? model : [model];
        const e = (0, env_1.env)();
        const url = `${e.aiBaseUrl}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey ?? ''}`,
            Accept: 'text/event-stream',
        };
        const errors = [];
        for (const [i, m] of models.entries()) {
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
                    errors.push(`${m}: HTTP ${res.status} ${text.slice(0, 200)}`);
                    this.logger.warn(`chatCompletionsWithToolsStream model ${m} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
                    if (res.status === 503 || res.status === 429) {
                        await this.sleep(500 * (i + 1));
                    }
                    continue;
                }
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let content = '';
                const toolCallsAccum = {};
                const codeExtractors = {};
                let currentToolIndex = -1;
                let currentToolName = '';
                const toolResults = [];
                const codeWritingTools = new Set(['write_file', 'edit_file', 'search_replace']);
                const finalizeToolCall = async (idx) => {
                    const accum = toolCallsAccum[idx];
                    if (!accum || !accum.id || accum.type !== 'function' || !accum.name) {
                        return;
                    }
                    const toolCall = {
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
                        }
                        catch (err) {
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
                    if (done)
                        break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed.startsWith(':'))
                            continue;
                        if (!trimmed.startsWith('data:'))
                            continue;
                        const data = trimmed.slice(5).trim();
                        if (data === '[DONE]')
                            continue;
                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta;
                            if (typeof delta?.content === 'string') {
                                content += delta.content;
                                if (onToken) {
                                    try {
                                        await onToken(delta.content);
                                    }
                                    catch (tokenErr) {
                                        this.logger.warn(`chatCompletionsWithToolsStream onToken error: ${tokenErr instanceof Error ? tokenErr.message : String(tokenErr)}`);
                                    }
                                }
                            }
                            if (Array.isArray(delta?.tool_calls)) {
                                for (const tc of delta.tool_calls) {
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
                                    if (tc.id)
                                        accum.id = tc.id;
                                    if (tc.type)
                                        accum.type = tc.type;
                                    if (tc.function?.name) {
                                        accum.name = tc.function.name;
                                        currentToolName = tc.function.name;
                                    }
                                    if (typeof tc.function?.arguments === 'string') {
                                        if (codeWritingTools.has(currentToolName)) {
                                            const extractor = codeExtractors[idx] ?? new CodeContentExtractor();
                                            codeExtractors[idx] = extractor;
                                            const { code: codeToken, path: filePath } = extractor.append(tc.function.arguments);
                                            if (filePath && onFileStart) {
                                                try {
                                                    await onFileStart(filePath);
                                                }
                                                catch (startErr) {
                                                    this.logger.warn(`chatCompletionsWithToolsStream onFileStart error: ${startErr instanceof Error ? startErr.message : String(startErr)}`);
                                                }
                                            }
                                            if (codeToken && onToken) {
                                                try {
                                                    const CHUNK_SIZE = 80;
                                                    if (codeToken.length <= CHUNK_SIZE) {
                                                        await onToken(codeToken);
                                                    }
                                                    else {
                                                        for (let i = 0; i < codeToken.length; i += CHUNK_SIZE) {
                                                            await onToken(codeToken.slice(i, i + CHUNK_SIZE));
                                                            await this.sleep(0);
                                                        }
                                                    }
                                                }
                                                catch (tokenErr) {
                                                    this.logger.warn(`chatCompletionsWithToolsStream onToken error: ${tokenErr instanceof Error ? tokenErr.message : String(tokenErr)}`);
                                                }
                                            }
                                        }
                                        accum.arguments = (accum.arguments ?? '') + tc.function.arguments;
                                    }
                                }
                            }
                        }
                        catch {
                        }
                    }
                }
                if (currentToolIndex >= 0) {
                    await finalizeToolCall(currentToolIndex);
                }
                const toolCalls = Object.values(toolCallsAccum)
                    .filter((tc) => tc.id && tc.type === 'function' && tc.name)
                    .map((tc) => ({
                    id: tc.id,
                    type: 'function',
                    function: {
                        name: tc.name,
                        arguments: tc.arguments ?? '',
                    },
                }));
                return { content: content || null, toolCalls, toolResults };
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                errors.push(`${m}: ${msg}`);
                this.logger.warn(`chatCompletionsWithToolsStream model ${m} error: ${msg}`);
            }
        }
        this.logger.error(`All chatCompletionsWithToolsStream models failed: ${errors.join('; ')}`);
        throw new Error(`All models failed: ${errors.join('; ')}`);
    }
    async chatCompletionsWithTools(messages, tools, model, apiKey) {
        const models = Array.isArray(model) ? model : [model];
        const e = (0, env_1.env)();
        const url = `${e.aiBaseUrl}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey ?? ''}`,
        };
        const errors = [];
        for (const [i, m] of models.entries()) {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers,
                    signal: this.createAbortSignal(AiGatewayService_1.NON_STREAMING_LLM_TIMEOUT_MS),
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
                    errors.push(`${m}: HTTP ${res.status} ${text.slice(0, 200)}`);
                    this.logger.warn(`chatCompletionsWithTools model ${m} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
                    if (res.status === 503 || res.status === 429) {
                        await this.sleep(500 * (i + 1));
                    }
                    continue;
                }
                const data = await res.json();
                const message = data.choices?.[0]?.message;
                const content = message?.content ?? null;
                const toolCalls = Array.isArray(message?.tool_calls)
                    ? message.tool_calls.filter((tc) => tc.type === 'function')
                    : [];
                return { content, toolCalls };
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                errors.push(`${m}: ${msg}`);
                this.logger.warn(`chatCompletionsWithTools model ${m} error: ${msg}`);
            }
        }
        this.logger.error(`All chatCompletionsWithTools models failed: ${errors.join('; ')}`);
        throw new Error(`All models failed: ${errors.join('; ')}`);
    }
    async proxyChatCompletions(body, apiKey) {
        const e = (0, env_1.env)();
        const url = `${e.aiBaseUrl}/chat/completions`;
        try {
            return await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                signal: this.createAbortSignal(AiGatewayService_1.NON_STREAMING_LLM_TIMEOUT_MS),
                body: JSON.stringify(body),
            });
        }
        catch (err) {
            this.logger.error(`proxyChatCompletions error: ${err instanceof Error ? err.message : String(err)}`);
            return new Response(JSON.stringify({ error: 'AI gateway unavailable' }), { status: 503 });
        }
    }
    async validateApiKey(apiKey) {
        const e = (0, env_1.env)();
        const models = Array.from(new Set([e.aiDefaultModel, e.aiReflectionModel, 'gpt-5.4', 'qwen-max', 'kimi-k2.5'].filter(Boolean)));
        const errors = [];
        for (const [i, model] of models.entries()) {
            try {
                const res = await fetch(`${e.aiBaseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                    signal: this.createAbortSignal(AiGatewayService_1.VALIDATION_LLM_TIMEOUT_MS),
                    body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 }),
                });
                if (res.ok)
                    return { valid: true, warning: null };
                const text = await res.text();
                errors.push(`${model}: ${res.status} ${text.slice(0, 120)}`);
                if (res.status === 503 || res.status === 429) {
                    await this.sleep(500 * (i + 1));
                }
            }
            catch (err) {
                errors.push(`${model}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        return { valid: false, warning: `AI gateway validation failed: ${errors.join('; ')}` };
    }
    async analyzeEditIntent(prompt, manifest, model = (0, env_1.env)().aiDefaultModel, apiKey) {
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
        const user = (0, types_1.buildPromptContent)(`Request: `, prompt);
        const text = await this.chatCompletions(this.buildMessages(system, user), model, apiKey);
        const parsed = this.extractJson(text);
        if (parsed && typeof parsed === 'object' && 'edit_type' in parsed) {
            return {
                edit_type: String(parsed.edit_type ?? 'content'),
                reasoning: String(parsed.reasoning ?? `User wants to: ${prompt}`),
                search_terms: Array.isArray(parsed.search_terms) ? parsed.search_terms.map(String) : (0, types_1.promptToString)(prompt).split(' ').slice(0, 4),
                regex_patterns: Array.isArray(parsed.regex_patterns) ? parsed.regex_patterns.map(String) : ['[A-Za-z]+'],
                file_types_to_search: Array.isArray(parsed.file_types_to_search) ? parsed.file_types_to_search.map(String) : ['.tsx', '.css'],
                expected_matches: typeof parsed.expected_matches === 'number' ? parsed.expected_matches : 3,
                fallback_search: String(parsed.fallback_search ?? (0, types_1.promptToString)(prompt)),
            };
        }
        return {
            edit_type: (0, types_1.promptToString)(prompt).toLowerCase().includes('color') ? 'style' : 'content',
            reasoning: `User wants to: ${(0, types_1.promptToString)(prompt)}`,
            search_terms: (0, types_1.promptToString)(prompt).split(' ').slice(0, 4),
            regex_patterns: ['[A-Za-z]+'],
            file_types_to_search: ['.tsx', '.css'],
            expected_matches: 3,
            fallback_search: (0, types_1.promptToString)(prompt),
        };
    }
    async generateComponent(section, tokens, model = (0, env_1.env)().aiDefaultModel, apiKey) {
        const system = `You are a React + TypeScript expert. Generate a single self-contained functional component using Tailwind CSS.
Return only the code inside a TypeScript code block (tsx). No explanations.`;
        const user = `Section: ${JSON.stringify(section)}\n\nDesign tokens: ${JSON.stringify(tokens ?? {})}`;
        const text = await this.chatCompletions(this.buildMessages(system, user), model, apiKey);
        const code = this.extractCodeBlock(text) || text.trim();
        return { code };
    }
    async generatePage(page, sections, model = (0, env_1.env)().aiDefaultModel, apiKey) {
        const system = `You are a React + TypeScript expert. Generate a single Next.js/React page component that imports and renders the provided sections.
Return only the code inside a TypeScript code block (tsx). No explanations.`;
        const user = `Page: ${JSON.stringify(page)}\n\nSections: ${JSON.stringify(sections ?? [])}`;
        const text = await this.chatCompletions(this.buildMessages(system, user), model, apiKey);
        const code = this.extractCodeBlock(text) || text.trim();
        return { code };
    }
    async designTokens(spec, model = (0, env_1.env)().aiDefaultModel, apiKey) {
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
        const parsed = this.extractJson(text);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
        return {
            theme: spec?.brand?.toLowerCase() ?? 'default',
            colors: { primary: '#3b82f6', secondary: '#64748b', background: '#ffffff', text: '#111827' },
            radius: { sm: '0.25rem', md: '0.5rem', lg: '1rem' },
            shadows: { sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)', md: '0 4px 6px -1px rgb(0 0 0 / 0.1)', lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)' },
            typography: { heading: 'Inter, sans-serif', body: 'Inter, sans-serif' },
        };
    }
    async summarizeSpec(prompt, model = (0, env_1.env)().aiDefaultModel, apiKey) {
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
        const user = (0, types_1.buildPromptContent)(`Request: `, prompt);
        const text = await this.chatCompletions(this.buildMessages(system, user), model, apiKey);
        const parsed = this.extractJson(text);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
        return {
            project_type: 'web_app',
            title: (0, types_1.promptToString)(prompt).slice(0, 40),
            tagline: 'Generated by LoveCode',
            target_audience: 'developers',
            core_features: ['landing page', 'contact form'],
            pages: [{ name: 'Home', route: '/' }],
            brand_tone: 'professional',
            color_preferences: 'modern',
            constraints: [],
        };
    }
    async uiUxBlueprint(spec, model = (0, env_1.env)().aiDefaultModel, apiKey) {
        const system = `You are a UX architect. Given a project spec, return a JSON blueprint with this shape:
{
  "pages": [
    { "name": "Home", "sections": [{ "name": "Hero", "type": "hero" }] }
  ]
}
Return JSON only.`;
        const user = `Spec: ${JSON.stringify(spec ?? {})}`;
        const text = await this.chatCompletions(this.buildMessages(system, user), model, apiKey);
        const parsed = this.extractJson(text);
        if (parsed && typeof parsed === 'object' && 'pages' in parsed) {
            return parsed;
        }
        const pages = spec?.pages ?? 1;
        return {
            pages: Array.from({ length: pages }).map((_, i) => ({
                name: i === 0 ? 'Home' : `Page ${i + 1}`,
                sections: [{ name: 'Hero', type: 'hero' }],
            })),
        };
    }
    async filePlan(spec, blueprint, model = (0, env_1.env)().aiDefaultModel, apiKey) {
        const system = `You are a software architect. Given a project spec and UI blueprint, produce a JSON file plan with this exact shape:
{
  "files": [
    { "path": "src/App.tsx", "purpose": "Main entry" }
  ]
}
Return JSON only.`;
        const user = `Spec: ${JSON.stringify(spec ?? {})}\n\nBlueprint: ${JSON.stringify(blueprint ?? {})}`;
        const text = await this.chatCompletions(this.buildMessages(system, user), model, apiKey);
        const parsed = this.extractJson(text);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.files)) {
            return {
                files: parsed.files
                    .filter((f) => f && typeof f === 'object' && 'path' in f)
                    .map((f) => ({ path: String(f.path), purpose: String(f.purpose ?? '') })),
            };
        }
        const title = spec?.title ?? 'Project';
        const pages = (blueprint?.pages ?? []).map((p) => String(p.name));
        return {
            files: [
                { path: 'src/App.tsx', purpose: `Main entry for ${title}` },
                ...pages.map((name) => ({ path: `src/pages/${name}.tsx`, purpose: `${name} page` })),
            ],
        };
    }
    buildMessages(system, user) {
        return [
            { role: 'system', content: system },
            { role: 'user', content: (0, types_1.normalizePromptContent)(user) },
        ];
    }
    extractContent(text) {
        if (!text || !text.trim().startsWith('{'))
            return null;
        try {
            const data = JSON.parse(text);
            const choices = data.choices;
            if (Array.isArray(choices) && choices.length > 0) {
                const message = choices[0].message;
                if (message?.content)
                    return message.content;
                const delta = choices[0].delta;
                if (delta?.content)
                    return delta.content;
            }
        }
        catch {
        }
        return null;
    }
    extractJson(text) {
        try {
            return JSON.parse(text);
        }
        catch {
        }
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            try {
                return JSON.parse(text.slice(start, end + 1));
            }
            catch {
            }
        }
        return null;
    }
    extractCodeBlock(text) {
        const match = text.match(/```(?:tsx?|jsx?|javascript|typescript)?\n?([\s\S]*?)\n?```/);
        return match ? match[1].trim() : null;
    }
};
exports.AiGatewayService = AiGatewayService;
AiGatewayService.NON_STREAMING_LLM_TIMEOUT_MS = 2 * 60 * 1000;
AiGatewayService.VALIDATION_LLM_TIMEOUT_MS = 30 * 1000;
exports.AiGatewayService = AiGatewayService = AiGatewayService_1 = __decorate([
    (0, common_1.Injectable)()
], AiGatewayService);
//# sourceMappingURL=ai-gateway.service.js.map