import type { StructuredTool } from '@langchain/core/tools';
import type { GraphDependencies } from '../graph';
import type { AgentState, TodoItem } from '../state';
import type { AgentContext } from '../types';
import { SandboxProvider } from './sandbox-provider';
import { FileManifest, type FileStatus } from './file-manifest';
import { CallbackStreamWriter } from './stream-writer';
import { toolsToDefinitions } from './tool-definitions';
import type { ToolCall } from './tool-definitions';
import { executeToolCall } from './tool-executor';

export interface ToolLoopMessage {
  role: string;
  content: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: ToolCall[];
}

export interface ToolLoopResult {
  finalContent: string;
  todos: TodoItem[];
  filesChanged: FileStatus[];
}

function createAgentContext(state: AgentState, deps: GraphDependencies): AgentContext {
  const sandboxProvider = new SandboxProvider(deps.e2b, state.sandboxId, state.projectId);
  const streamWriter = new CallbackStreamWriter((event) => {
    if (event.type === 'file_update') {
      deps.emit({ type: 'file_update', data: event.data });
    } else if (event.type === 'todos_update') {
      deps.emit({ type: 'todos_update', data: event.data });
    } else if (event.type === 'command_delta' || event.type === 'tool_progress') {
      deps.emit({ type: event.type, data: event.data });
    } else {
      deps.logger.debug(`[tool event] ${event.type}: ${JSON.stringify(event.data).slice(0, 200)}`);
    }
  });

  return {
    sandboxProvider,
    streamWriter,
    fileManifest: new FileManifest(),
    todos: state.todos ?? [],
    supabaseProjectId: state.projectId,
    userId: state.userId,
    chatId: state.sandboxId,
  };
}

/**
 * Run a tool-enabled conversation loop for an agent node.
 * Returns the final assistant text (after any tool calls are resolved) and the
 * possibly-mutated todo list from the AgentContext.
 */
export async function runToolLoop(
  deps: GraphDependencies,
  state: AgentState,
  buildTools: (context: AgentContext, docsTools: StructuredTool[]) => StructuredTool[],
  messages: ToolLoopMessage[],
  nodeType: string,
  userApiKey?: string,
  maxIterations = 10,
): Promise<ToolLoopResult> {
  const context = createAgentContext(state, deps);
  const docTools = deps.agentMcpToolService?.getTools(context) ?? [];
  const tools = buildTools(context, docTools);
  const toolDefinitions = toolsToDefinitions(tools);

  await context.sandboxProvider.ensureAlive(state.userId);

  let finalContent = '';
  let iteration = 0;

  const executeSingleToolCall = async (toolCall: ToolCall) => {
    const result = await executeToolCall(toolCall, tools);
    deps.logger.debug(`[${nodeType}] tool result: ${result.name} = ${result.content.slice(0, 200)}`);
    return result;
  };

  while (iteration < maxIterations) {
    iteration++;
    deps.logger.debug(`[${nodeType}] tool loop iteration ${iteration}`);

    const { content, toolCalls, toolResults } = await deps.aiGateway.chatCompletionsWithToolsStream(
      messages,
      toolDefinitions,
      deps.modelResolver.resolveSequence(nodeType),
      userApiKey,
      async (token) => {
        await deps.emit({ type: 'token', data: { content: token } });
      },
      async (toolCall) => executeSingleToolCall(toolCall),
      async (path) => {
        await deps.emit({ type: 'file_start', data: { path } });
      },
    );

    if (content) {
      finalContent = content;
      deps.logger.debug(`[${nodeType}] content preview: ${content.slice(0, 200)}`);
    }

    if (!toolCalls.length) {
      break;
    }

    messages.push({
      role: 'assistant',
      content: content ?? null,
      tool_calls: toolCalls,
    });

    for (const result of toolResults) {
      messages.push({
        role: 'tool',
        tool_call_id: result.toolCallId,
        name: result.name,
        content: result.content,
      });
    }
  }

  return {
    finalContent,
    todos: context.todos as TodoItem[],
    filesChanged: context.fileManifest.listChanged(),
  };
}
