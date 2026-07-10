import { z } from "zod";
import { AgentTool } from "../types";
import type { TodoItem } from "../../state";

const todoSchema = z.object({
  id: z.string().describe("Unique identifier for the todo item"),
  content: z
    .string()
    .optional()
    .describe("The description/content of the todo item"),
  status: z
    .enum(["pending", "in_progress", "completed"])
    .optional()
    .describe("The current status of the todo item"),
});

type TodoUpdate = { id: string; content?: string; status?: "pending" | "in_progress" | "completed" };

const updateTodosSchema = z.object({
  merge: z
    .boolean()
    .describe(
      "Whether to merge the todos with the existing todos. If true, the todos will be merged into the existing todos based on the id field. You can leave unchanged properties undefined. If false, the new todos will replace the existing todos."
    ),
  todos: z
    .array(todoSchema)
    .describe(
      "Array of todo items. When merge is true, only include todos that need updates. When merge is false, this is the complete list."
    ),
});

export class UpdateTodosTool extends AgentTool {
  name = "update_todos";
  description = `Update the todo list to track progress on tasks.

Use proactively for:
1. Complex multi-step tasks (3+ distinct steps)
2. Non-trivial tasks requiring careful planning
3. User explicitly requests todo list
4. User provides multiple tasks (numbered/comma-separated)
5. After completing tasks - mark complete with merge=true and add follow-ups
6. When starting new tasks - mark as in_progress (ideally only one at a time)

Skip for:
1. Single, straightforward tasks
2. Trivial tasks with no organizational benefit
3. Tasks completable in < 3 trivial steps
4. Purely conversational/informational requests
5. Todo items should NOT include operational actions done in service of higher-level tasks.

NEVER INCLUDE THESE IN TODOS: linting; testing; searching or examining the codebase.`;
  schema = updateTodosSchema;

  /**
   * Return the id of the first todo that is still pending, or undefined if
   * every todo is completed.
   */
  private findExpectedNextTodoIdInList(todos: TodoItem[]): string | undefined {
    return todos.find((t) => t.status === "pending")?.id;
  }

  /**
   * Return the id of the todo currently marked as in_progress, if any.
   */
  private findCurrentInProgressTodoIdInList(todos: TodoItem[]): string | undefined {
    return todos.find((t) => t.status === "in_progress")?.id;
  }

  /**
   * Validate that a list of merge updates respects strict sequential order.
   * A todo may only become `in_progress` if it is the first pending todo,
   * and it may only become `completed` if it is the currently in-progress todo.
   * Content-only updates are allowed for any todo.
   */
  private validateSequentialUpdates(
    updates: TodoUpdate[],
    currentTodos: TodoItem[]
  ): { valid: boolean; message?: string } {
    const workingMap = new Map(currentTodos.map((t) => [t.id, { ...t }]));

    for (const update of updates) {
      const working = workingMap.get(update.id);
      if (!working) {
        // New todo being added. It must define content and status, and if it
        // becomes in_progress/completed it has to respect the current order.
        if (update.content === undefined || update.status === undefined) {
          return {
            valid: false,
            message: `New todo "${update.id}" must include both content and status.`,
          };
        }
      }

      if (update.status !== undefined) {
        const expectedNextId = this.findExpectedNextTodoIdInList(
          Array.from(workingMap.values())
        );
        const currentInProgressId = this.findCurrentInProgressTodoIdInList(
          Array.from(workingMap.values())
        );

        if (update.status === "in_progress" && update.id !== expectedNextId) {
          return {
            valid: false,
            message: expectedNextId
              ? `Cannot mark todo "${update.id}" as in_progress while todo "${expectedNextId}" is still pending. Complete "${expectedNextId}" first.`
              : `Cannot mark todo "${update.id}" as in_progress because there are no pending todos left.`,
          };
        }

        if (update.status === "completed" && update.id !== currentInProgressId) {
          return {
            valid: false,
            message: currentInProgressId
              ? `Cannot mark todo "${update.id}" as completed while todo "${currentInProgressId}" is in progress. Complete "${currentInProgressId}" first.`
              : `Cannot mark todo "${update.id}" as completed because no todo is currently in progress.`,
          };
        }
      }

      // Apply update to working copy so subsequent updates see the new state.
      if (working) {
        workingMap.set(update.id, {
          ...working,
          ...(update.content !== undefined && { content: update.content }),
          ...(update.status !== undefined && { status: update.status }),
        });
      } else {
        workingMap.set(update.id, {
          id: update.id,
          content: update.content!,
          status: update.status!,
        });
      }
    }

    return { valid: true };
  }

  /**
   * Validate that a final todo list has at most one in_progress todo and that
   * every todo before the first pending/in_progress one is completed.
   */
  private validateFinalTodoOrder(todos: TodoItem[]): {
    valid: boolean;
    message?: string;
  } {
    let seenPending = false;
    let seenInProgress = false;

    for (const todo of todos) {
      if (todo.status === "in_progress") {
        if (seenInProgress) {
          return {
            valid: false,
            message: "Only one todo may be in_progress at a time.",
          };
        }
        if (seenPending) {
          return {
            valid: false,
            message: `Todo "${todo.id}" is in_progress but an earlier todo is still pending.`,
          };
        }
        seenInProgress = true;
      } else if (todo.status === "pending") {
        if (seenInProgress) {
          return {
            valid: false,
            message: `Todo "${todo.id}" is pending while an earlier todo is in_progress. Todos must be sequential.`,
          };
        }
        seenPending = true;
      }
    }

    return { valid: true };
  }

  async _call(args: z.infer<typeof updateTodosSchema>): Promise<string> {
    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args: { merge: args.merge, count: args.todos.length } },
    });

    try {
      const typedUpdates = args.todos as TodoUpdate[];

      if (args.merge) {
        const validation = this.validateSequentialUpdates(
          typedUpdates,
          this.agentContext.todos
        );
        if (!validation.valid) {
          throw new Error(
            `Sequential order violation: ${validation.message} Follow the todo list in order: start todo 1, complete it, then todo 2, and so on.`
          );
        }

        const existingMap = new Map(
          this.agentContext.todos.map((t) => [t.id, t])
        );
        for (const todo of typedUpdates) {
          const existing = existingMap.get(todo.id);
          if (existing) {
            existingMap.set(todo.id, {
              ...existing,
              ...(todo.content !== undefined && { content: todo.content }),
              ...(todo.status !== undefined && { status: todo.status }),
            });
          } else {
            existingMap.set(todo.id, {
              id: todo.id,
              content: todo.content!,
              status: todo.status!,
            });
          }
        }
        this.agentContext.todos = Array.from(existingMap.values());
      } else {
        const replacement = typedUpdates.map((t) => ({
          id: t.id,
          content: t.content ?? "",
          status: t.status ?? "pending",
        }));
        const validation = this.validateFinalTodoOrder(replacement);
        if (!validation.valid) {
          throw new Error(
            `Invalid todo order: ${validation.message} Maintain sequential order with at most one in_progress todo, and it must be the first pending todo.`
          );
        }
        this.agentContext.todos = replacement;
      }

      this.agentContext.streamWriter.write({
        type: "todos_update",
        data: { todos: this.agentContext.todos },
      });

      const completed = this.agentContext.todos.filter(
        (t) => t.status === "completed"
      ).length;
      const inProgress = this.agentContext.todos.filter(
        (t) => t.status === "in_progress"
      ).length;
      const pending = this.agentContext.todos.filter(
        (t) => t.status === "pending"
      ).length;

      const result = `Updated todos: ${completed} completed, ${inProgress} in progress, ${pending} pending`;

      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result },
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      throw new Error(`Failed to update todos: ${message}`);
    }
  }
}
