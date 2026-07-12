"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WriteFileTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const project_store_1 = require("../../../../lib/db/project-store");
const file_manifest_1 = require("../file-manifest");
const stream_writer_1 = require("../stream-writer");
const writeFileSchema = zod_1.z.object({
    path: zod_1.z.string().describe("The file path relative to the app root"),
    content: zod_1.z.string().describe("The content to write to the file"),
    description: zod_1.z
        .string()
        .optional()
        .describe("Brief description of the change"),
});
class WriteFileTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "write_file";
        this.description = "Create a new file or completely overwrite an existing file. " +
            "Use this for: (1) creating new files, (2) complete rewrites where most of the file changes, " +
            "(3) when you don't have the exact existing content to match against. " +
            "For small surgical changes (1-3 lines), prefer search_replace. " +
            "For medium changes (one function/section), prefer edit_file. " +
            "Files are automatically persisted to local storage.";
        this.schema = writeFileSchema;
    }
    async _call(args) {
        const tsPath = (0, file_manifest_1.ensureTypeScriptExtension)(args.path);
        const extensionChanged = tsPath !== args.path;
        const normalizedPath = (0, file_manifest_1.normalizeFilePath)(tsPath);
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { path: normalizedPath, description: args.description } },
        });
        if (this.agentContext.fileManifest.isProtected(normalizedPath)) {
            const error = `Cannot write to protected file: ${normalizedPath}. This file is critical to the sandbox environment and cannot be modified.`;
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${error}` },
            });
            throw new Error(error);
        }
        try {
            this.updateTodosForPath(normalizedPath, 'in_progress');
            await this.agentContext.sandboxProvider.writeFile(normalizedPath, args.content);
            this.updateTodosForPath(normalizedPath, 'completed');
            if (this.agentContext.supabaseProjectId) {
                try {
                    (0, project_store_1.upsertFile)(this.agentContext.supabaseProjectId, normalizedPath, args.content);
                }
                catch (err) {
                    console.warn(`[write_file] SQLite persist failed for ${normalizedPath}:`, err);
                }
            }
            let existing = false;
            try {
                existing = await this.agentContext.sandboxProvider.readFile(normalizedPath).then(() => true).catch(() => false);
            }
            catch {
                existing = false;
            }
            this.agentContext.streamWriter.write((0, stream_writer_1.createFileUpdateEvent)(normalizedPath, args.content, existing ? "modified" : "created"));
            try {
                await this.agentContext.fileManifest.updateFile(normalizedPath, existing ? "modified" : "created");
            }
            catch (err) {
                console.warn(`[write_file] Manifest update failed for ${normalizedPath}:`, err);
            }
            const extensionNotice = extensionChanged
                ? ` (note: path was corrected from ${args.path} to ${normalizedPath} because this project uses TypeScript)`
                : "";
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Wrote ${normalizedPath}${extensionNotice}` },
            });
            return `Successfully wrote ${normalizedPath}${extensionNotice}`;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[write_file] Failed to write ${normalizedPath}: ${message}`);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${message}` },
            });
            throw new Error(`Failed to write ${normalizedPath}: ${message}`);
        }
    }
}
exports.WriteFileTool = WriteFileTool;
//# sourceMappingURL=write_file.js.map