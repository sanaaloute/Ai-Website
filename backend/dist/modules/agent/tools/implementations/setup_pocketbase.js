"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetupPocketBaseTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const setupPocketBaseSchema = zod_1.z.object({
    templateId: zod_1.z
        .string()
        .optional()
        .describe("Label only — echoed back in the status summary. Templates are applied automatically when the project template is selected; this parameter does NOT apply, create, or migrate anything."),
});
class SetupPocketBaseTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "setup_pocketbase";
        this.description = "Check the running PocketBase backend status (URL, existing collections, seeded records). This does NOT create, migrate, or reconfigure collections; schema setup is handled automatically when the project template is selected.";
        this.schema = setupPocketBaseSchema;
    }
    async _call(args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { templateId: args.templateId } },
        });
        const provider = this.agentContext.sandboxProvider;
        try {
            const result = await provider.startPocketBase({
                templateId: args.templateId,
            });
            const summary = `PocketBase running at ${result.url}. Template: ${result.template.id}. Collections: ${result.collectionsCreated.join(", ")}. Records seeded: ${result.recordsSeeded}.`;
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: summary },
            });
            return summary;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${message}` },
            });
            throw new Error(`Failed to setup PocketBase: ${message}`);
        }
    }
}
exports.SetupPocketBaseTool = SetupPocketBaseTool;
//# sourceMappingURL=setup_pocketbase.js.map