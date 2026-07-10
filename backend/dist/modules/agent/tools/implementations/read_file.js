"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadFileTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const WORKSPACE_ROOT = "/home/user/app";
function resolveWorkspacePath(inputPath) {
    if (inputPath.startsWith(WORKSPACE_ROOT)) {
        return inputPath;
    }
    if (inputPath.startsWith("/")) {
        return `${WORKSPACE_ROOT}${inputPath}`;
    }
    return `${WORKSPACE_ROOT}/${inputPath.replace(/^\.\//, "")}`;
}
const readFileSchema = zod_1.z.object({
    path: zod_1.z.string().describe("The file path to read (relative to /home/user/app or absolute)"),
    start_line_one_indexed: zod_1.z
        .number()
        .int()
        .min(1)
        .optional()
        .describe("The one-indexed line number to start reading from (inclusive)."),
    end_line_one_indexed_inclusive: zod_1.z
        .number()
        .int()
        .min(1)
        .optional()
        .describe("The one-indexed line number to end reading at (inclusive)."),
});
class ReadFileTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "read_file";
        this.description = `Read the content of a file from the application workspace (/home/user/app).
  
- You have the capability to call multiple tools in a single response. It is always better to speculatively read multiple files as a batch that are potentially useful.`;
        this.schema = readFileSchema;
    }
    async _call(args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args },
        });
        const resolvedPath = resolveWorkspacePath(args.path);
        console.log(`[read_file] Model requested: ${args.path} → resolved: ${resolvedPath}`);
        try {
            const content = await this.agentContext.sandboxProvider.readFile(resolvedPath);
            const start = args.start_line_one_indexed;
            const end = args.end_line_one_indexed_inclusive;
            let result = content;
            if (start != null || end != null) {
                const hasTrailingNewline = content.endsWith("\n");
                const lines = (hasTrailingNewline ? content.slice(0, -1) : content).split("\n");
                const startIdx = Math.max(0, (start ?? 1) - 1);
                const endIdx = Math.min(lines.length, end ?? lines.length);
                result = lines.slice(startIdx, endIdx).join("\n");
                if (endIdx >= lines.length && hasTrailingNewline) {
                    result += "\n";
                }
            }
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Read ${args.path}` },
            });
            return result;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${message}` },
            });
            throw new Error(`Failed to read ${resolvedPath}: ${message}`);
        }
    }
}
exports.ReadFileTool = ReadFileTool;
//# sourceMappingURL=read_file.js.map