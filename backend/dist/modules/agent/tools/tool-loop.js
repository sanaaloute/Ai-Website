"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runToolLoop = runToolLoop;
const sandbox_provider_1 = require("./sandbox-provider");
const file_manifest_1 = require("./file-manifest");
const stream_writer_1 = require("./stream-writer");
const tool_definitions_1 = require("./tool-definitions");
const tool_executor_1 = require("./tool-executor");
const cancellation_1 = require("../../../lib/cancellation");
function createAgentContext(state, deps) {
    const sandboxProvider = new sandbox_provider_1.SandboxProvider(deps.e2b, state.sandboxId, state.projectId);
    const streamWriter = new stream_writer_1.CallbackStreamWriter((event) => {
        if (event.type === 'file_update') {
            deps.emit({ type: 'file_update', data: event.data });
        }
        else if (event.type === 'todos_update') {
            deps.emit({ type: 'todos_update', data: event.data });
        }
        else if (event.type === 'command_delta' || event.type === 'tool_progress') {
            deps.emit({ type: event.type, data: event.data });
        }
        else {
            deps.logger.debug(`[tool event] ${event.type}: ${JSON.stringify(event.data).slice(0, 200)}`);
        }
    });
    return {
        sandboxProvider,
        streamWriter,
        fileManifest: new file_manifest_1.FileManifest(),
        todos: state.todos ?? [],
        supabaseProjectId: state.projectId,
        userId: state.userId,
        chatId: state.sandboxId,
    };
}
async function runToolLoop(deps, state, buildTools, messages, nodeType, aiCredentials, maxIterations = 10) {
    const context = createAgentContext(state, deps);
    const docTools = deps.agentMcpToolService?.getTools(context) ?? [];
    const tools = buildTools(context, docTools);
    const toolDefinitions = (0, tool_definitions_1.toolsToDefinitions)(tools);
    await context.sandboxProvider.ensureAlive(state.userId);
    let finalContent = '';
    let iteration = 0;
    const executeSingleToolCall = async (toolCall) => {
        const result = await (0, tool_executor_1.executeToolCall)(toolCall, tools, deps.signal);
        deps.logger.debug(`[${nodeType}] tool result: ${result.name} = ${result.content.slice(0, 200)}`);
        return result;
    };
    while (iteration < maxIterations) {
        iteration++;
        (0, cancellation_1.throwIfCancelled)(deps.signal);
        deps.logger.debug(`[${nodeType}] tool loop iteration ${iteration}`);
        const { content, toolCalls, toolResults } = await deps.aiGateway.chatCompletionsWithToolsStream(messages, toolDefinitions, deps.modelResolver.resolveSequence(nodeType), aiCredentials, async (token, kind) => {
            await deps.emit({ type: 'token', data: { content: token, kind } });
        }, async (toolCall) => executeSingleToolCall(toolCall), async (path) => {
            await deps.emit({ type: 'file_start', data: { path } });
        }, deps.signal, deps.modelResolver.generationParams(nodeType));
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
        todos: context.todos,
        filesChanged: context.fileManifest.listChanged(),
    };
}
//# sourceMappingURL=tool-loop.js.map