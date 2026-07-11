// Pure utility functions extracted from app/generation/page.tsx
// These functions have no React dependencies and no closure over component state.

import type { StoredChatMessageV1 } from '@/lib/generation/storedChatTypes';

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

const CHAT_MESSAGE_TYPES: ChatMessage['type'][] = [
  'user',
  'ai',
  'system',
  'file-update',
  'command',
  'error'
];

function isChatMessageType(t: string): t is ChatMessage['type'] {
  return (CHAT_MESSAGE_TYPES as string[]).includes(t);
}

function storedRowsToChatMessages(rows: StoredChatMessageV1[]): ChatMessage[] {
  return rows
    .filter((r) => r.type === 'user' || r.type === 'ai')
    .map((r) => ({
      content: r.content,
      type: isChatMessageType(r.type) ? r.type : 'system',
      timestamp: new Date(r.timestamp),
      metadata: r.metadata as ChatMessage['metadata'] | undefined
    }));
}

function chatMessagesToStoredRows(messages: ChatMessage[]): StoredChatMessageV1[] {
  return messages
    .filter((m) => m.type === 'user' || m.type === 'ai')
    .map((m) => ({
      content: m.content,
      type: m.type,
      timestamp: m.timestamp.getTime(),
      metadata: m.metadata as Record<string, unknown> | undefined
    }));
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

interface ProjectNameSnapshot {
  fileStructure?: string;
  structureContent?: string;
  sandboxFiles?: Record<string, string>;
  chat?: Array<{ content: string; type: string; timestamp: number; metadata?: Record<string, unknown> }>;
}

function hasMeaningfulSnapshot(snapshot: ProjectNameSnapshot, emptyStructureMarker: string): boolean {
  if (Object.keys(snapshot.sandboxFiles || {}).length > 0) return true;
  if ((snapshot.chat || []).length > 0) return true;
  if ((snapshot.fileStructure || '').trim().length > 0) return true;
  const structure = (snapshot.structureContent || '').trim();
  return structure.length > 0 && structure !== emptyStructureMarker;
}

function inferProjectNameFromFiles(files: Record<string, string>): string {
  const priorityPaths = [
    'src/components/layout/Header.tsx',
    'src/components/layout/Header.jsx',
    'src/pages/Index.tsx',
    'src/pages/Index.jsx',
  ];
  const sources = [
    ...priorityPaths.map((p) => files[p]).filter((v): v is string => typeof v === 'string'),
    ...Object.values(files || {}).slice(0, 20),
  ];

  const normalizeCandidate = (value: string): string => {
    return value.replace(/\s+/g, ' ').trim();
  };

  const normalizeSlug = (value: string): string => {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_.]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const isGenericCandidate = (value: string): boolean => {
    const cleaned = normalizeCandidate(value);
    if (!cleaned) return true;

    const slug = normalizeSlug(cleaned);
    if (!slug) return true;

    if (/^project-[a-z0-9]{4,12}$/.test(slug)) return true;

    const genericNames = new Set([
      'app',
      'my-app',
      'my-project',
      'project',
      'sandbox-app',
      'sandbox',
      'untitled-project',
      'untitled',
      'ai-website-app',
      'ai-website-export',
      'nextjs-app',
      'react-app',
    ]);
    if (genericNames.has(slug)) return true;

    const navLabelNames = new Set([
      'home',
      'dashboard',
      'projects',
      'tasks',
      'auth',
      'features',
      'docs',
      'pricing',
      'about',
      'contact',
      'login',
      'sign-in',
    ]);
    return navLabelNames.has(slug);
  };

  const preferredPatterns = [
    /(?:brand|appName|siteName|projectName)\s*[:=]\s*['"`]([^'"`]{2,80})['"`]/i,
    /<a[^>]*className=["'`][^"'`]*(?:logo|brand|navbar-brand|site-title)[^"'`]*["'`][^>]*>\s*([^<\n]{2,80})\s*<\/a>/i,
    /<a[^>]*href=["'`](?:\/|#)["'`][^>]*>\s*([^<\n]{2,80})\s*<\/a>/i,
    /<h1[^>]*>\s*([^<\n]{2,80})\s*<\/h1>/i,
  ];

  const fallbackPatterns = [
    /<title>\s*([^<\n]{2,80})\s*<\/title>/i,
  ];

  for (const src of sources) {
    if (!src) continue;
    for (const pattern of preferredPatterns) {
      const m = src.match(pattern);
      const candidate = normalizeCandidate(m?.[1] || '');
      if (
        candidate.length >= 2 &&
        candidate.length <= 80 &&
        !isGenericCandidate(candidate)
      ) {
        return candidate;
      }
    }
  }

  for (const src of sources) {
    if (!src) continue;
    for (const pattern of fallbackPatterns) {
      const m = src.match(pattern);
      const candidate = normalizeCandidate(m?.[1] || '');
      if (
        candidate.length >= 2 &&
        candidate.length <= 80 &&
        !isGenericCandidate(candidate)
      ) {
        return candidate;
      }
    }
  }

  return '';
}

function slugifyExportName(name: string, fallback: string): string {
  const cleaned = (name || '').trim().toLowerCase().replace(/[^a-z0-9-_.]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  return cleaned || fallback;
}

function extractPackageNameFromImportPath(importPath: string): string | null {
  const source = importPath.trim();
  if (!source || source.startsWith('.') || source.startsWith('/') || source.startsWith('@/') || source.startsWith('~/')) {
    return null;
  }
  if (source.startsWith('@')) {
    const [scope, name] = source.split('/');
    if (!scope || !name) return null;
    return `${scope}/${name}`;
  }
  const [name] = source.split('/');
  return name || null;
}

function getMissingLocalImportsFromPreviewError(
  errorText: string
): Array<{ importSource: string; importerPath: string }> {
  const issues: Array<{ importSource: string; importerPath: string }> = [];
  const matches = Array.from(
    errorText.matchAll(/Failed to resolve import\s+["']([^"']+)["']\s+from\s+["']([^"']+)["']/gi)
  );
  for (const match of matches) {
    const importSource = (match[1] || '').trim();
    const importerPath = (match[2] || '').trim();
    if (!importSource || !importerPath) continue;
    const isLocalImport = importSource.startsWith('.') || importSource.startsWith('/') || importSource.startsWith('@/') || importSource.startsWith('~/');
    if (isLocalImport) {
      issues.push({ importSource, importerPath });
    }
  }
  return issues;
}

function resolveMissingImportSuggestion(importerPath: string, importSource: string): string {
  const cleanedImporter = importerPath.replace(/^\/home\/user\/app\//, '');
  const importerParts = cleanedImporter.split('/').filter(Boolean);
  importerParts.pop();
  const sourceParts = importSource.split('/');
  const stack = [...importerParts];
  for (const part of sourceParts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  const base = stack.join('/');
  const candidates = [
    `${base}.jsx`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.ts`,
    `${base}/index.jsx`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.ts`,
  ];
  return candidates[0];
}

function buildMissingLocalImportFixPrompt(
  rawError: string,
  issues: Array<{ importSource: string; importerPath: string }>,
  previewFixChainOfThought: string
): string {
  const issueLines = issues
    .slice(0, 6)
    .map((issue, idx) => {
      const suggested = resolveMissingImportSuggestion(issue.importerPath, issue.importSource);
      return `${idx + 1}. Import "${issue.importSource}" in "${issue.importerPath}" is unresolved. Suggested file path: "${suggested}".`;
    })
    .join('\n');

  const err = rawError.trim();
  return (
    `### Local import resolution (preview)\n` +
    `Unresolved imports were detected in the View panel.\n\n` +
    `#### Error report\n\`\`\`text\n${err}\n\`\`\`\n\n` +
    `#### Missing local imports\n${issueLines}\n\n` +
    `#### Rules for this fix\n` +
    `- Fix unresolved local imports with the minimum edits.\n` +
    `- Prefer creating the missing component/module file when the import path is correct.\n` +
    `- If a similarly named file already exists, update the import path instead.\n` +
    `- Ensure default-imported React components export default when required.\n` +
    `- Avoid unrelated refactors.\n\n` +
    `${previewFixChainOfThought}\n`
  );
}

function getMissingPackagesFromPreviewError(errorText: string): string[] {
  const matches = Array.from(errorText.matchAll(/Failed to resolve import\s+["']([^"']+)["']/gi));
  if (matches.length === 0) return [];

  const blocked = new Set(['react', 'react-dom']);
  const packages = new Set<string>();

  for (const match of matches) {
    const importPath = (match[1] || '').trim();
    const packageName = extractPackageNameFromImportPath(importPath);
    if (!packageName || blocked.has(packageName)) continue;
    packages.add(packageName);
  }

  return Array.from(packages);
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
