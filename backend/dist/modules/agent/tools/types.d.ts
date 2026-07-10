import { StructuredTool } from "@langchain/core/tools";
import type { AgentContext } from "../types";
import type { TodoItem } from "../state";
export declare abstract class AgentTool extends StructuredTool {
    protected agentContext: AgentContext;
    constructor(context: AgentContext);
    protected findBestTodoForPath(path: string): TodoItem | undefined;
    protected updateTodosForPath(path: string, status: 'in_progress' | 'completed'): void;
}
