"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeToolCall = executeToolCall;
async function executeToolCall(toolCall, tools) {
    const tool = tools.find((t) => t.name === toolCall.function.name);
    if (!tool) {
        return {
            toolCallId: toolCall.id,
            name: toolCall.function.name,
            content: `Error: unknown tool ${toolCall.function.name}`,
            success: false,
        };
    }
    let args = {};
    try {
        args = JSON.parse(toolCall.function.arguments);
    }
    catch {
        return {
            toolCallId: toolCall.id,
            name: toolCall.function.name,
            content: 'Error: invalid JSON arguments',
            success: false,
        };
    }
    try {
        const result = await tool.invoke(args);
        return {
            toolCallId: toolCall.id,
            name: toolCall.function.name,
            content: typeof result === 'string' ? result : JSON.stringify(result),
            success: true,
        };
    }
    catch (err) {
        return {
            toolCallId: toolCall.id,
            name: toolCall.function.name,
            content: `Error executing ${toolCall.function.name}: ${err instanceof Error ? err.message : String(err)}`,
            success: false,
        };
    }
}
//# sourceMappingURL=tool-executor.js.map