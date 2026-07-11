import type { TodoItem } from './state';
import type { SandboxProvider } from './tools/sandbox-provider';
import type { FileManifest } from './tools/file-manifest';
import type { StreamWriter } from './tools/stream-writer';
export interface AgentContext {
    sandboxProvider: SandboxProvider;
    streamWriter: StreamWriter;
    fileManifest: FileManifest;
    todos: TodoItem[];
    supabaseProjectId?: string;
    supabaseOrganizationSlug?: string;
    userId?: string;
    chatId: string;
}
