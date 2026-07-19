"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeterministicToolError = void 0;
exports.isDeterministicToolError = isDeterministicToolError;
const tools_1 = require("@langchain/core/tools");
class DeterministicToolError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DeterministicToolError';
    }
}
exports.DeterministicToolError = DeterministicToolError;
function isDeterministicToolError(err) {
    if (!err)
        return false;
    if (err instanceof DeterministicToolError)
        return true;
    if (err instanceof tools_1.ToolInputParsingException)
        return true;
    const name = err.name;
    return name === 'ZodError';
}
//# sourceMappingURL=errors.js.map