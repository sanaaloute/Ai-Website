"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateManifestTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const updateManifestSchema = zod_1.z.object({
    file_path: zod_1.z.string().describe("Path of the file that was changed"),
    operation: zod_1.z
        .enum(["created", "modified", "deleted"])
        .describe("The type of operation performed on the file"),
});
class UpdateManifestTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "update_manifest";
        this.description = `Update the file state tracker manifest to record a file operation.

Use this after creating, modifying, or deleting a file to keep the manifest in sync.

Operations:
- "created": File was newly created
- "modified": Existing file was edited
- "deleted": File was removed`;
        this.schema = updateManifestSchema;
    }
    async _call(args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { file_path: args.file_path, operation: args.operation } },
        });
        const tracker = this.agentContext.fileManifest;
        try {
            await tracker.updateFile(args.file_path, args.operation);
            const msg = `Manifest updated: ${args.file_path} → ${args.operation}`;
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: msg },
            });
            return msg;
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${errMsg}` },
            });
            return `Error: ${errMsg}`;
        }
    }
}
exports.UpdateManifestTool = UpdateManifestTool;
//# sourceMappingURL=update_manifest.js.map