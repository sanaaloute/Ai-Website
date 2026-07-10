"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteFileTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const project_store_1 = require("../../../../lib/db/project-store");
const file_manifest_1 = require("../file-manifest");
const deleteFileSchema = zod_1.z.object({
    path: zod_1.z.string().describe("The file path to delete"),
});
class DeleteFileTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "delete_file";
        this.description = "Permanently delete a file or directory from the codebase. " +
            "Use this when a file is no longer needed (e.g., after refactoring, removing unused components, " +
            "or cleaning up temporary files). The deletion is also removed from local persistent storage. " +
            "Be careful — this action cannot be undone.";
        this.schema = deleteFileSchema;
    }
    async _call(args) {
        const normalizedPath = (0, file_manifest_1.normalizeFilePath)(args.path);
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { path: normalizedPath } },
        });
        if (this.agentContext.fileManifest.isProtected(normalizedPath)) {
            const error = `Cannot delete protected file: ${normalizedPath}. This file is critical to the sandbox environment and cannot be removed.`;
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${error}` },
            });
            throw new Error(error);
        }
        try {
            const result = await this.agentContext.sandboxProvider.runCommand(`rm -rf ${normalizedPath}`);
            if (!result.success) {
                throw new Error(result.stderr || `Failed to delete ${args.path}`);
            }
            if (this.agentContext.supabaseProjectId) {
                try {
                    (0, project_store_1.deleteFile)(this.agentContext.supabaseProjectId, normalizedPath);
                }
                catch (err) {
                    console.warn(`[delete_file] SQLite delete failed for ${normalizedPath}:`, err);
                }
            }
            try {
                await this.agentContext.fileManifest.updateFile(normalizedPath, "deleted");
            }
            catch (err) {
                console.warn(`[delete_file] Manifest update failed for ${normalizedPath}:`, err);
            }
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Deleted ${normalizedPath}` },
            });
            return `Successfully deleted ${normalizedPath}`;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${message}` },
            });
            throw new Error(`Failed to delete ${normalizedPath}: ${message}`);
        }
    }
}
exports.DeleteFileTool = DeleteFileTool;
//# sourceMappingURL=delete_file.js.map