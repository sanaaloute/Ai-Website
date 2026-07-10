import type { TodoItem } from './state';
import type { SandboxProvider } from './tools/sandbox-provider';
import type { FileManifest } from './tools/file-manifest';
import type { StreamWriter } from './tools/stream-writer';

/**
 * Context shared with all LangChain agent tools.
 * It wires the sandbox provider, event streaming, file manifest tracking,
 * and lightweight mutable state (todos, project ids) that tools may update.
 */
export interface AgentContext {
  /** Sandbox abstraction used by file/command tools */
  sandboxProvider: SandboxProvider;

  /** Stream writer used to emit tool/file/todo events */
  streamWriter: StreamWriter;

  /** File manifest tracker for protected paths and change tracking */
  fileManifest: FileManifest;

  /** Current todo list; update_todos tool mutates this */
  todos: TodoItem[];

  /** Optional Supabase project reference connected to the app */
  supabaseProjectId?: string;

  /** Optional Supabase organization reference */
  supabaseOrganizationSlug?: string;

  /** Optional user id for the current session */
  userId?: string;

  /** Chat / thread id used to auto-create local projects */
  chatId: string;
}
