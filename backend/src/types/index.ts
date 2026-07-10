import { User as SupabaseUser } from '@supabase/supabase-js';

export type User = SupabaseUser;

export interface RequestWithUser extends Request {
  user?: User;
  rawBody?: Buffer;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: unknown;
}

export interface SandboxData {
  sandboxId: string;
  /** Vite dev-server preview URL (port-specific E2B host). */
  url: string;
  provider: string;
  createdAt: string;
  endAt: string;
  files?: Record<string, string>;
  structure?: string;
  fileCount?: number;
}

export interface ProjectSummary {
  projectId: string;
  projectName: string;
  updatedAt: number;
  preview?: string | null;
  vercelProjectId?: string | null;
  vercelDomainUrl?: string | null;
  vercelDeployedAt?: string | null;
  githubRepoUrl?: string | null;
}

export interface SavedFile {
  path: string;
  content: string;
}

export interface FilePlanEntry {
  path: string;
  purpose: string;
}

export interface SearchPlan {
  edit_type: string;
  reasoning: string;
  search_terms: string[];
  regex_patterns: string[];
  file_types_to_search: string[];
  expected_matches: number;
  fallback_search: string;
}

export interface SseEvent {
  type: string;
  [key: string]: unknown;
}

// ============================================================================
// Multimodal prompt content (text + image_url)
// ============================================================================

export interface TextPromptPart {
  type: 'text';
  text: string;
}

export interface ImagePromptPart {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export type PromptPart = TextPromptPart | ImagePromptPart;

/**
 * A prompt may be submitted as plain text or as a multimodal array of
 * text and image parts. This is the only user-facing input the agents accept.
 */
export type PromptContent = string | PromptPart[];

/**
 * Convert a PromptContent value to a plain string representation.
 * Image parts are replaced with a placeholder so nodes that need a string
 * summary (e.g., plan steps, todo labels) can still produce readable output.
 */
export function promptToString(prompt: PromptContent): string {
  if (typeof prompt === 'string') return prompt;
  return prompt
    .map((part) => {
      if (part.type === 'text') return part.text;
      if (part.type === 'image_url') return '[image]';
      return '[unknown]';
    })
    .join(' ')
    .trim();
}

/**
 * Build a user message content value from a context string and the raw prompt.
 * If the prompt is an image array, the context is prepended as a text part
 * and the original parts are preserved.
 */
export function buildPromptContent(context: string, prompt: PromptContent): PromptContent {
  if (typeof prompt === 'string') {
    return `${context}${prompt}`;
  }
  return [
    { type: 'text', text: context },
    ...prompt,
  ];
}

/**
 * Normalize a PromptContent value so it can be used as the `content` field
 * in an LLM message. Strings are returned as-is; arrays are returned as-is.
 */
export function normalizePromptContent(prompt: PromptContent): string | PromptPart[] {
  return prompt;
}
