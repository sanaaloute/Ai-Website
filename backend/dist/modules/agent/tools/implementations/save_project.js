"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveProjectTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const project_store_1 = require("../../../../lib/db/project-store");
const saveProjectSchema = zod_1.z.object({
    description: zod_1.z
        .string()
        .optional()
        .describe("Optional note about what is being saved"),
});
class SaveProjectTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "save_project";
        this.description = "Explicitly save a full snapshot of ALL project files to persistent local storage (SQLite). " +
            "NOTE: Individual file edits (write_file, edit_file, search_replace) are ALREADY auto-persisted automatically. " +
            "Use this tool when: (1) you want to ensure a complete checkpoint exists, " +
            "(2) after a large batch of changes across many files, " +
            "(3) before making risky changes and you want a fallback point, " +
            "(4) no project exists yet and you need to create one. " +
            "If no project is associated, this tool auto-creates one from the current sandbox. " +
            "Returns the number of files saved and the project ID.";
        this.schema = saveProjectSchema;
    }
    async _call(args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { description: args.description } },
        });
        try {
            const provider = this.agentContext.sandboxProvider;
            const projectId = this.agentContext.supabaseProjectId;
            const userId = this.agentContext.userId;
            if (!projectId) {
                const autoProjectId = `local-${this.agentContext.chatId}`;
                (0, project_store_1.upsertProject)(autoProjectId, `Project ${this.agentContext.chatId.slice(0, 8)}`, userId);
                this.agentContext.supabaseProjectId = autoProjectId;
            }
            const resolvedProjectId = this.agentContext.supabaseProjectId;
            const existing = (0, project_store_1.getProject)(resolvedProjectId);
            if (!existing) {
                (0, project_store_1.upsertProject)(resolvedProjectId, `Project ${resolvedProjectId.slice(0, 8)}`, userId);
            }
            const fileList = await provider.listFiles("/home/user/app");
            const codeFiles = fileList.filter((p) => p.endsWith(".ts") ||
                p.endsWith(".tsx") ||
                p.endsWith(".js") ||
                p.endsWith(".jsx") ||
                p.endsWith(".css") ||
                p.endsWith(".json") ||
                p.endsWith(".html") ||
                p.endsWith(".md"));
            const filesToSave = [];
            for (const path of codeFiles) {
                try {
                    const content = await provider.readFile(path);
                    if (typeof content === "string") {
                        filesToSave.push({ path, content });
                    }
                }
                catch {
                }
            }
            const savedCount = (0, project_store_1.upsertFilesBulk)(resolvedProjectId, filesToSave);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: {
                    tool: this.name,
                    result: `Saved ${savedCount} files to project ${resolvedProjectId}`,
                },
            });
            return `Successfully saved ${savedCount} files to persistent storage (project: ${resolvedProjectId}).`;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${message}` },
            });
            throw new Error(`Failed to save project: ${message}`);
        }
    }
}
exports.SaveProjectTool = SaveProjectTool;
//# sourceMappingURL=save_project.js.map