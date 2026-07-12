import { env } from '@/config/env';

/**
 * Registry of supported LLM providers.
 *
 * Every provider exposes an OpenAI-compatible `/chat/completions` endpoint.
 * Users can store one API key per provider (see `user_provider_keys` table)
 * and pick an active provider; the AI gateway falls back through the user's
 * other providers when the active one fails.
 */
export type ProviderId =
  | 'tokenfree'
  | 'openai'
  | 'openrouter'
  | 'groq'
  | 'ollama_cloud'
  | 'kie_ai';

export interface LlmProvider {
  id: ProviderId;
  label: string;
  /** Base URL of the OpenAI-compatible API (without trailing slash). */
  baseUrl: string;
  /** Page where the user can obtain an API key. */
  keySiteUrl: string;
  /**
   * Approved models for this provider, ordered "biggest/most capable first".
   * The model resolver reverses the order for lightweight ("fast") roles.
   */
  models: string[];
  /** Extra headers to send with every request (e.g. OpenRouter attribution). */
  extraHeaders?: Record<string, string>;
}

function envOverride(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim().replace(/\/+$/, '') : undefined;
}

/**
 * Build the provider list. Base URLs can be overridden via environment
 * variables (`TOKENFREE_BASE_URL` / legacy `AI_BASE_URL`, `OPENAI_BASE_URL`,
 * `OPENROUTER_BASE_URL`, `GROQ_BASE_URL`, `OLLAMA_CLOUD_BASE_URL`,
 * `KIE_AI_BASE_URL`).
 */
export function listProviders(): LlmProvider[] {
  const e = env();
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

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && listProviders().some((p) => p.id === value);
}

export function getProvider(id: ProviderId): LlmProvider {
  const provider = listProviders().find((p) => p.id === id);
  if (!provider) {
    // Should never happen when callers validate with isProviderId first.
    throw new Error(`Unknown LLM provider: ${id}`);
  }
  return provider;
}

/** Approved models for a provider (biggest first). */
export function providerModels(id: ProviderId): string[] {
  return getProvider(id).models;
}

/** A user's stored API key bound to a provider. */
export interface AiCredential {
  provider: ProviderId;
  apiKey: string;
}

/** Accepted wherever an API key was previously passed as a plain string. */
export type AiKeyInput = string | AiCredential | AiCredential[];

/** Mask an API key for display: first 5 + last 4 chars. */
export function previewKey(key: string): string {
  return `${key.slice(0, 5)}...${key.slice(-4)}`;
}
