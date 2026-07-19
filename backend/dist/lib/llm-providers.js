"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProviders = listProviders;
exports.isProviderId = isProviderId;
exports.getProvider = getProvider;
exports.providerModels = providerModels;
exports.previewKey = previewKey;
const env_1 = require("../config/env");
function envOverride(name) {
    const v = process.env[name];
    return v && v.trim() ? v.trim().replace(/\/+$/, '') : undefined;
}
function listProviders() {
    const e = (0, env_1.env)();
    return [
        {
            id: 'tokenfree',
            label: 'TokenFree',
            baseUrl: envOverride('TOKENFREE_BASE_URL') ?? e.aiBaseUrl,
            keySiteUrl: e.aiWebsiteApiKeySiteUrl,
            models: ['kimi-k2.5', 'qwen-max'],
        },
        {
            id: 'openai',
            label: 'OpenAI',
            baseUrl: envOverride('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1',
            keySiteUrl: 'https://platform.openai.com/api-keys',
            models: ['gpt-4.1', 'gpt-4.1-mini'],
        },
        {
            id: 'openrouter',
            label: 'OpenRouter',
            baseUrl: envOverride('OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1',
            keySiteUrl: 'https://openrouter.ai/keys',
            models: ['openai/gpt-4.1', 'google/gemini-2.0-flash-001'],
            extraHeaders: {
                'HTTP-Referer': e.siteUrl,
                'X-Title': 'AI-Website',
            },
        },
        {
            id: 'groq',
            label: 'Groq',
            baseUrl: envOverride('GROQ_BASE_URL') ?? 'https://api.groq.com/openai/v1',
            keySiteUrl: 'https://console.groq.com/keys',
            models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
        },
        {
            id: 'ollama_cloud',
            label: 'Ollama Cloud',
            baseUrl: envOverride('OLLAMA_CLOUD_BASE_URL') ?? 'https://ollama.com/v1',
            keySiteUrl: 'https://ollama.com/settings/keys',
            models: ['gpt-oss:120b-cloud', 'qwen3-coder:480b-cloud'],
        },
        {
            id: 'kie_ai',
            label: 'kie.ai',
            baseUrl: envOverride('KIE_AI_BASE_URL') ?? 'https://api.kie.ai/api/v1',
            keySiteUrl: 'https://kie.ai/api-key',
            models: ['gpt-4o'],
        },
    ];
}
function isProviderId(value) {
    return typeof value === 'string' && listProviders().some((p) => p.id === value);
}
function getProvider(id) {
    const provider = listProviders().find((p) => p.id === id);
    if (!provider) {
        throw new Error(`Unknown LLM provider: ${id}`);
    }
    return provider;
}
function providerModels(id) {
    return getProvider(id).models;
}
function previewKey(key) {
    return `${key.slice(0, 5)}...${key.slice(-4)}`;
}
//# sourceMappingURL=llm-providers.js.map