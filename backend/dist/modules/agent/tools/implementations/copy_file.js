"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopyFileTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const file_manifest_1 = require("../file-manifest");
const stream_writer_1 = require("../stream-writer");
const copyFileSchema = zod_1.z.object({
    from: zod_1.z.string().describe("The source file path (relative to /home/user/app)"),
    to: zod_1.z.string().describe("The destination file path (relative to /home/user/app)"),
});
class CopyFileTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "copy_file";
        this.description = "Copy a file to a new location in the codebase. " +
            "Use this when you need to duplicate a file (e.g., creating a new page based on an existing template, " +
            "or copying a component to modify it for a different use case). " +
            "Both paths are relative to /home/user/app. " +
            "The new file is automatically persisted to local storage.";
        this.schema = copyFileSchema;
    }
    async _call(args) {
        const normalizedFrom = (0, file_manifest_1.normalizeFilePath)(args.from);
        const normalizedTo = (0, file_manifest_1.normalizeFilePath)(args.to);
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { from: normalizedFrom, to: normalizedTo } },
        });
        if (this.agentContext.fileManifest.isProtected(normalizedTo)) {
            const error = `Cannot copy to protected path: ${normalizedTo}. This path is reserved for critical sandbox files.`;
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${error}` },
            });
            throw new Error(error);
        }
        try {
            const content = await this.agentContext.sandboxProvider.readFile(normalizedFrom);
            await this.agentContext.sandboxProvider.writeFile(normalizedTo, content);
            this.agentContext.streamWriter.write((0, stream_writer_1.createFileUpdateEvent)(normalizedTo, content, "created"));
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Copied ${normalizedFrom} to ${normalizedTo}` },
            });
            return `Successfully copied ${normalizedFrom} to ${normalizedTo}`;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${message}` },
            });
            throw new Error(`Failed to copy file: ${message}`);
        }
    }
}
exports.CopyFileTool = CopyFileTool;
//# sourceMappingURL=copy_file.js.map