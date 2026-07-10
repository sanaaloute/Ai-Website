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
export type PromptContent = string | PromptPart[];
export declare function promptToString(prompt: PromptContent): string;
export declare function buildPromptContent(context: string, prompt: PromptContent): PromptContent;
export declare function normalizePromptContent(prompt: PromptContent): string | PromptPart[];
