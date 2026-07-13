"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeToolCall = executeToolCall;
const cancellation_1 = require("../../../lib/cancellation");
const MAX_TOOL_ATTEMPTS = 3;
async function executeToolCall(toolCall, tools, signal, maxAttempts = MAX_TOOL_ATTEMPTS) {
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
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        (0, cancellation_1.throwIfCancelled)(signal);
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
            if ((0, cancellation_1.isCancellation)(err)) {
                throw err;
            }
            lastError = err;
            if (attempt < maxAttempts) {
                await (0, cancellation_1.sleepWithSignal)(500 * attempt, signal);
            }
        }
    }
    return {
        toolCallId: toolCall.id,
        name: toolCall.function.name,
        content: `Error executing ${toolCall.function.name} after ${maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
        success: false,
    };
}
//# sourceMappingURL=tool-executor.js.map