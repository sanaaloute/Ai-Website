"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeToolCall = executeToolCall;
const cancellation_1 = require("../../../lib/cancellation");
const errors_1 = require("./errors");
const env_1 = require("../../../config/env");
const MAX_TOOL_ATTEMPTS = 3;
function truncateToolResult(content) {
    const max = (0, env_1.env)().agentToolResultMaxChars;
    if (content.length <= max)
        return content;
    return (content.slice(0, max) +
        `\n\n[TRUNCATED: result was ${content.length} chars, showing first ${max}. ` +
        `Narrow the query (smaller file range, more specific command, grep with include_pattern) to see more.]`);
}
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
    let attemptsUsed = 0;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        attemptsUsed = attempt;
        (0, cancellation_1.throwIfCancelled)(signal);
        try {
            const result = await tool.invoke(args);
            return {
                toolCallId: toolCall.id,
                name: toolCall.function.name,
                content: truncateToolResult(typeof result === 'string' ? result : JSON.stringify(result)),
                success: true,
            };
        }
        catch (err) {
            if ((0, cancellation_1.isCancellation)(err)) {
                throw err;
            }
            lastError = err;
            if ((0, errors_1.isDeterministicToolError)(err)) {
                break;
            }
            if (attempt < maxAttempts) {
                await (0, cancellation_1.sleepWithSignal)(500 * attempt, signal);
            }
        }
    }
    return {
        toolCallId: toolCall.id,
        name: toolCall.function.name,
        content: truncateToolResult(`Error executing ${toolCall.function.name}${attemptsUsed > 1 ? ` after ${attemptsUsed} attempts` : ''}: ${lastError instanceof Error ? lastError.message : String(lastError)}`),
        success: false,
    };
}
//# sourceMappingURL=tool-executor.js.map