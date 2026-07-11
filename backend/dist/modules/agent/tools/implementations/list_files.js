"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListFilesTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const WORKSPACE_ROOT = "/home/user/app";
function resolveWorkspacePath(dir) {
    if (!dir || dir === "." || dir === "./") {
        return WORKSPACE_ROOT;
    }
    if (dir.startsWith(WORKSPACE_ROOT)) {
        return dir.replace(/\/$/, "");
    }
    if (dir.startsWith("/")) {
        return WORKSPACE_ROOT;
    }
    return `${WORKSPACE_ROOT}/${dir.replace(/^\.\//, "").replace(/\/$/, "")}`;
}
const listFilesSchema = zod_1.z.object({
    directory: zod_1.z.string().optional().describe("Optional subdirectory to list (e.g. 'src/components')"),
    recursive: zod_1.z
        .boolean()
        .optional()
        .describe("Whether to list files recursively (default: false)"),
});
class ListFilesTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "list_files";
        this.description = "List files in the application workspace. By default, lists only the immediate directory contents. Use recursive=true to list all files recursively. Only sees files inside /home/user/app — never system files.";
        this.schema = listFilesSchema;
    }
    async _call(args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args },
        });
        try {
            const dir = resolveWorkspacePath(args.directory);
            const files = await this.agentContext.sandboxProvider.listFiles(dir);
            console.log(`[list_files] Listed ${files.length} files in ${dir}, first 10:`, files.slice(0, 10));
            let result = files;
            if (!args.recursive) {
                const prefix = dir === WORKSPACE_ROOT ? "" : dir.replace(`${WORKSPACE_ROOT}/`, "") + "/";
                const seen = new Set();
                result = [];
                for (const f of files) {
                    const relative = f.startsWith(prefix) ? f.slice(prefix.length) : f;
                    const topLevel = relative.split("/")[0];
                    if (topLevel && !seen.has(topLevel)) {
                        seen.add(topLevel);
                        result.push(topLevel);
                    }
                }
            }
            result.sort();
            const output = result.map((f) => ` - ${f}`).join("\n") || "(no files)";
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Listed ${result.length} items` },
            });
            return output;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${message}` },
            });
            throw new Error(`Failed to list files: ${message}`);
        }
    }
}
exports.ListFilesTool = ListFilesTool;
//# sourceMappingURL=list_files.js.map