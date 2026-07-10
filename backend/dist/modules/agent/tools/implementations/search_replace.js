"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchReplaceTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const project_store_1 = require("../../../../lib/db/project-store");
const file_manifest_1 = require("../file-manifest");
const stream_writer_1 = require("../stream-writer");
const searchReplaceSchema = zod_1.z.object({
    file_path: zod_1.z
        .string()
        .describe("The path to the file you want to search and replace in."),
    old_string: zod_1.z
        .string()
        .describe("The text to replace (must be unique within the file, and must match the file contents exactly, including all whitespace and indentation)"),
    new_string: zod_1.z
        .string()
        .describe("The edited text to replace the old_string (must be different from the old_string)"),
});
class SearchReplaceTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "search_replace";
        this.description = `Use this tool to propose a search and replace operation on an existing file.

The tool will replace ONE occurrence of old_string with new_string in the specified file.

CRITICAL REQUIREMENTS FOR USING THIS TOOL:

1. UNIQUENESS: The old_string MUST uniquely identify the specific instance you want to change. This means:
   - Include AT LEAST 3-5 lines of context BEFORE the change point
   - Include AT LEAST 3-5 lines of context AFTER the change point
   - Include all whitespace, indentation, and surrounding code exactly as it appears in the file

2. SINGLE INSTANCE: This tool can only change ONE instance at a time. If you need to change multiple instances:
   - Make separate calls to this tool for each instance
   - Each call must uniquely identify its specific instance using extensive context

3. VERIFICATION: Before using this tool:
   - If multiple instances exist, gather enough context to uniquely identify each one
   - Plan separate tool calls for each instance
`;
        this.schema = searchReplaceSchema;
    }
    async _call(args) {
        const tsPath = (0, file_manifest_1.ensureTypeScriptExtension)(args.file_path);
        const extensionChanged = tsPath !== args.file_path;
        const normalizedPath = (0, file_manifest_1.normalizeFilePath)(tsPath);
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { path: normalizedPath } },
        });
        if (this.agentContext.fileManifest.isProtected(normalizedPath)) {
            const error = `Cannot edit protected file: ${normalizedPath}. This file is critical to the sandbox environment and cannot be modified.`;
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${error}` },
            });
            throw new Error(error);
        }
        try {
            if (args.old_string === args.new_string) {
                throw new Error("old_string and new_string must be different");
            }
            const content = await this.agentContext.sandboxProvider.readFile(normalizedPath);
            const index = content.indexOf(args.old_string);
            if (index === -1) {
                throw new Error(`old_string not found in ${normalizedPath}. Make sure the text matches exactly, including whitespace.`);
            }
            const secondIndex = content.indexOf(args.old_string, index + 1);
            if (secondIndex !== -1) {
                throw new Error(`old_string is not unique in ${normalizedPath}. Include more context to make it unique.`);
            }
            const newContent = content.slice(0, index) + args.new_string + content.slice(index + args.old_string.length);
            this.updateTodosForPath(normalizedPath, 'in_progress');
            await this.agentContext.sandboxProvider.writeFile(normalizedPath, newContent);
            this.updateTodosForPath(normalizedPath, 'completed');
            if (this.agentContext.supabaseProjectId) {
                try {
                    (0, project_store_1.upsertFile)(this.agentContext.supabaseProjectId, normalizedPath, newContent);
                }
                catch (err) {
                    console.warn(`[search_replace] SQLite persist failed for ${normalizedPath}:`, err);
                }
            }
            this.agentContext.streamWriter.write((0, stream_writer_1.createFileUpdateEvent)(normalizedPath, newContent, "modified"));
            try {
                await this.agentContext.fileManifest.updateFile(normalizedPath, "modified");
            }
            catch (err) {
                console.warn(`[search_replace] Manifest update failed for ${normalizedPath}:`, err);
            }
            let syntaxResult = "";
            if (normalizedPath.endsWith(".ts") || normalizedPath.endsWith(".tsx")) {
                const check = await this.agentContext.sandboxProvider.runCommand(`cd /home/user/app && npx tsc --noEmit --skipLibCheck --project tsconfig.app.json`);
                if (!check.success) {
                    const err = check.stderr || check.stdout || "";
                    if (err.includes("error TS")) {
                        syntaxResult = `\n\nTypeScript check:\n${err}`;
                    }
                }
            }
            const extensionNotice = extensionChanged
                ? ` (note: path was corrected from ${args.file_path} to ${normalizedPath} because this project uses TypeScript)`
                : "";
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Edited ${normalizedPath}${extensionNotice}${syntaxResult}` },
            });
            return `Successfully applied edits to ${normalizedPath}${extensionNotice}${syntaxResult}`;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${message}` },
            });
            throw new Error(`Failed to edit ${normalizedPath}: ${message}`);
        }
    }
}
exports.SearchReplaceTool = SearchReplaceTool;
//# sourceMappingURL=search_replace.js.map