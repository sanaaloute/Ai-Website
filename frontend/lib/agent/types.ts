/**
 * Core types for agent stream events (frontend-only).
 * The agent runtime has moved to the external backend.
 * These types remain for typing the streaming response from /api/agent-stream.
 */

// ============================================================================
// Todo Types
// ============================================================================

export interface Todo {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
}

// ============================================================================
// Stream Events (sent to frontend)
// ============================================================================

export interface QuestionnaireQuestion {
  id: string;
  question: string;
  type: "text" | "radio" | "checkbox";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface PlanData {
  title: string;
  summary: string;
  plan: string;
}

export type AgentStreamEvent =
  | { type: "status"; data: { status: AgentStatus; message: string } }
  | { type: "token"; data: { content: string; node?: string; kind?: "thinking" | "code" } }
  | { type: "tool_start"; data: { tool: string; args: Record<string, unknown> } }
  | { type: "tool_end"; data: { tool: string; result: string } }
  | { type: "tool_progress"; data: { tool: string; message?: string; percent?: number } }
  | { type: "command_delta"; data: { tool: string; stream: "stdout" | "stderr"; chunk: string } }
  | { type: "file_start"; data: { path: string } }
  | { type: "file_update"; data: { path: string; status: string; size: number; lineCount: number } }
  | { type: "snapshot"; data: { snapshotId: string; sandboxId: string } }
  | { type: "todos_update"; data: { todos: Todo[] } }
  | { type: "review"; data: { passed: boolean; issues: string[]; suggestions: string[] } }
  | { type: "review_max_reached"; data: { issues: string[]; suggestions?: string[]; todos?: Array<{ id: string; content: string; status: string }> } }
  | { type: "preview"; data: { url: string } }
  | { type: "done"; data: { finalResponse: string } }
  | { type: "suggestions"; data: { items: string[] } }
  | { type: "error"; data: { message: string } }
  | { type: "questionnaire"; data: { questions: QuestionnaireQuestion[] } }
  | { type: "plan"; data: PlanData }
  | { type: "exit_plan"; data: { confirmed: boolean } }
  | { type: "chat_summary"; data: { summary: string } };

type AgentStatus =
  | "analyzing"
  | "planning"
  | "installing"
  | "executing"
  | "reviewing"
  | "debugging"
  | "finalizing"
  | "done"
  | "error"
  | "snapshot";
