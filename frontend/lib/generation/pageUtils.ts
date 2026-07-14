// Pure utility functions extracted from app/generation/page.tsx
// These functions have no React dependencies and no closure over component state.

export interface ChatMessage {
  content: string;
  type: 'user' | 'ai' | 'system' | 'file-update' | 'command' | 'error';
  timestamp: Date;
  metadata?: {
    hidden?: boolean;
    scrapedUrl?: string;
    scrapedContent?: unknown;
    generatedCode?: string;
    appliedFiles?: string[];
    commandType?: 'input' | 'output' | 'error' | 'success';
    brandingData?: {
      colorScheme?: string;
      colors?: Record<string, string>;
      typography?: {
        fontFamilies?: Record<string, string>;
        fontSizes?: Record<string, string>;
        fontWeights?: Record<string, string>;
        lineHeights?: Record<string, string>;
      };
      spacing?: Record<string, string>;
      borderRadius?: Record<string, string>;
      shadows?: Record<string, string>;
      buttonStyles?: Record<string, string>;
      components?: {
        buttonPrimary?: {
          background?: string;
          textColor?: string;
          borderRadius?: string;
          shadow?: string;
        };
        buttonSecondary?: {
          background?: string;
          textColor?: string;
          borderRadius?: string;
          shadow?: string;
        };
      };
      personality?: {
        tone?: string;
        voice?: string;
        energy?: string;
        targetAudience?: string;
      };
      [key: string]: unknown;
    };
    sourceUrl?: string;
  };
}

export type JsonEnvelope = Record<string, unknown>;
export type AnalyzerIssue = {
  severity?: string;
  file?: string;
  message?: string;
  suggestion?: string;
};

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function getVisibleUserMessage(content: string): string {
  if (!content.includes('COMPONENT-LEVEL EDIT PROMPT')) return content;
  const taskMatch = content.match(/TASK:\s*\n([\s\S]*?)\n\s*OUTPUT REQUIREMENTS:/);
  const task = taskMatch?.[1]?.trim();
  return task || 'Update selected component';
}

export function isInsufficientQuotaError(message: string): boolean {
  const text = (message || '').toLowerCase();
  return (
    text.includes('insufficient_user_quota') ||
    text.includes('insufficient quota') ||
    text.includes('not enough credits') ||
    text.includes('insufficient credits') ||
    text.includes('额度不足')
  );
}

export function isInsufficientQuotaByCode(statusCode?: number, code?: string): boolean {
  return statusCode === 403 && (code || '').toLowerCase() === 'insufficient_user_quota';
}

type GatewayErrorType =
  | 'quota'
  | 'rate_limit'
  | 'invalid_api_key'
  | 'model_not_found'
  | 'context_length_exceeded'
  | 'unknown';

interface GatewayErrorClassification {
  type: GatewayErrorType;
  userMessage: string;
  showQuotaDialog: boolean;
  showApiKeyDialog: boolean;
}

export function classifyGatewayError(
  statusCode?: number,
  code?: string,
  message?: string
): GatewayErrorClassification {
  const c = (code || '').toLowerCase();
  const m = (message || '').toLowerCase();

  // Quota / insufficient credits
  if (statusCode === 403 && c === 'insufficient_user_quota') {
    return {
      type: 'quota',
      userMessage: message || 'Your API account does not have enough credits. Please recharge and try again.',
      showQuotaDialog: true,
      showApiKeyDialog: false,
    };
  }
  if (
    m.includes('insufficient_user_quota') ||
    m.includes('insufficient quota') ||
    m.includes('not enough credits') ||
    m.includes('insufficient credits') ||
    m.includes('额度不足')
  ) {
    return {
      type: 'quota',
      userMessage: message || 'Your API account does not have enough credits. Please recharge and try again.',
      showQuotaDialog: true,
      showApiKeyDialog: false,
    };
  }

  // Rate limit
  if (c === 'rate_limit_reached' || statusCode === 429 || m.includes('rate limit')) {
    return {
      type: 'rate_limit',
      userMessage: 'Rate limit reached. Please wait a moment and try again.',
      showQuotaDialog: false,
      showApiKeyDialog: false,
    };
  }

  // Invalid API key. The upstream gateway (new-api) reports a rejected key as
  // "Invalid token" with HTTP 401, so match those spellings too — otherwise
  // users just see a generic error instead of being asked to fix their key.
  if (
    c === 'invalid_api_key' ||
    m.includes('invalid api key') ||
    m.includes('incorrect api key') ||
    m.includes('invalid token') ||
    m.includes('http 401')
  ) {
    return {
      type: 'invalid_api_key',
      userMessage: 'Invalid API key. Please check your API key and try again.',
      showQuotaDialog: false,
      showApiKeyDialog: true,
    };
  }

  // Model not found
  if (
    c === 'model_not_found' ||
    m.includes('model not found') ||
    m.includes('no available channel')
  ) {
    return {
      type: 'model_not_found',
      userMessage: 'The requested AI model is not available right now. Please try a different model or try again later.',
      showQuotaDialog: false,
      showApiKeyDialog: false,
    };
  }

  // Context length exceeded
  if (
    c === 'context_length_exceeded' ||
    m.includes('context length') ||
    m.includes('maximum context length')
  ) {
    return {
      type: 'context_length_exceeded',
      userMessage: 'Your message is too long for this model. Please try a shorter prompt.',
      showQuotaDialog: false,
      showApiKeyDialog: false,
    };
  }

  return {
    type: 'unknown',
    userMessage: message || 'An error occurred. Please try again.',
    showQuotaDialog: false,
    showApiKeyDialog: false,
  };
}

export function getPreviewErrorSignature(rawError: string): string {
  const normalized = (rawError || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
  if (!normalized) return '';
  const primaryLine = normalized.split('\n')[0]?.trim() || normalized;
  const fileMatch =
    normalized.match(/\/home\/user\/app\/[^\s:]+/i) ||
    normalized.match(/src\/[^\s:]+/i);
  const filePart = fileMatch ? fileMatch[0] : 'unknown-file';
  return `${filePart}::${primaryLine}`;
}

interface GenerationFile {
  path: string;
  content: string;
  type: 'css' | 'json' | 'html' | 'javascript';
  completed: boolean;
  edited: boolean;
}

export function mapSandboxFilesToGenerationFiles(filesMap: Record<string, string>): GenerationFile[] {
  return Object.entries(filesMap || {}).map(([path, content]) => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const type: GenerationFile['type'] =
      ext === 'css'
        ? 'css'
        : ext === 'json'
          ? 'json'
          : ext === 'html'
            ? 'html'
            : 'javascript';

    return {
      path,
      content: String(content),
      type,
      completed: true,
      edited: false,
    };
  });
}

/**
 * Generate a short, readable project name from the user's initial prompt.
 * Strips filler words and capitalizes the remaining significant words.
 */
export function generateProjectNameFromPrompt(prompt: string): string {
  if (!prompt || typeof prompt !== 'string') return 'My Project';

  const fillerWords = new Set([
    'a', 'an', 'the', 'my', 'for', 'with', 'and', 'or', 'to', 'of', 'in', 'on', 'at',
    'from', 'by', 'create', 'build', 'make', 'design', 'develop', 'generate', 'code',
    'website', 'site', 'web', 'app', 'application', 'page', 'portfolio', 'landing',
    'using', 'use', 'based', 'that', 'this', 'these', 'those', 'is', 'are', 'be',
    'me', 'us', 'i', 'we', 'you', 'he', 'she', 'they', 'it',
  ]);

  const words = prompt
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !fillerWords.has(w))
    .slice(0, 4);

  if (words.length === 0) {
    // Fallback: take first 2 non-empty words from original prompt
    const fallback = prompt.split(/\s+/).filter((w) => w.length > 1).slice(0, 2);
    if (fallback.length === 0) return 'My Project';
    return fallback
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
      .slice(0, 40);
  }

  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .slice(0, 40);
}
