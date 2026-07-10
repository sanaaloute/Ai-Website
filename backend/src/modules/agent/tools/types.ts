/**
 * Base types for LangChain agent tools.
 */

import { StructuredTool } from "@langchain/core/tools";
import type { AgentContext } from "../types";
import type { TodoItem } from "../state";

export abstract class AgentTool extends StructuredTool {
  protected agentContext: AgentContext;

  constructor(context: AgentContext) {
    super();
    this.agentContext = context;
  }

  /**
   * Find the single best todo whose content references a given file path.
   * Prefers full-path matches, then basename matches.
   */
  protected findBestTodoForPath(path: string): TodoItem | undefined {
    const normalizedPath = path.toLowerCase().replace(/^\.?\//, '');
    const basename = normalizedPath.split('/').pop() || normalizedPath;
    let fullMatch: TodoItem | undefined;
    let baseMatch: TodoItem | undefined;
    for (const todo of this.agentContext.todos) {
      const content = todo.content.toLowerCase();
      if (content.includes(normalizedPath)) {
        if (!fullMatch) fullMatch = todo;
      } else if (content.includes(basename) && !baseMatch) {
        baseMatch = todo;
      }
    }
    return fullMatch || baseMatch;
  }

  /**
   * Update todos that reference a file path to the given status.
   * Emits a `todos_update` event when any todo changes.
   *
   * This is a heuristic: the model may still be working on a later todo while
   * an earlier one is marked in_progress, so we allow file-based updates to
   * match the actual file being written. The explicit `update_todos` tool still
   * enforces strict sequential order.
   */
  protected updateTodosForPath(path: string, status: 'in_progress' | 'completed'): void {
    const matching = this.findBestTodoForPath(path);
    if (!matching) return;

    let changed = false;
    const idx = this.agentContext.todos.findIndex((t) => t.id === matching.id);
    if (idx >= 0 && this.agentContext.todos[idx].status !== status) {
      this.agentContext.todos[idx] = { ...this.agentContext.todos[idx], status };
      changed = true;
    }

    // When starting a new file, also mark any other in_progress todo as completed
    // so the UI never shows two tasks active at once.
    if (status === 'in_progress') {
      for (let i = 0; i < this.agentContext.todos.length; i++) {
        const todo = this.agentContext.todos[i];
        if (todo.status === 'in_progress' && todo.id !== matching.id) {
          this.agentContext.todos[i] = { ...todo, status: 'completed' };
          changed = true;
        }
      }
    }

    if (changed) {
      this.agentContext.streamWriter.write({
        type: 'todos_update',
        data: { todos: this.agentContext.todos },
      });
    }
  }
}
