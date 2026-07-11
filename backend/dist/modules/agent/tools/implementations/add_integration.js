"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddIntegrationTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const SUPPORTED_PROVIDERS = ["supabase"];
const addIntegrationSchema = zod_1.z.object({
    provider: zod_1.z
        .enum(SUPPORTED_PROVIDERS)
        .describe("The integration provider to add (e.g., 'supabase')"),
});
class AddIntegrationTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "add_integration";
        this.description = "Add an integration provider to the app (e.g., Supabase for auth, database, or server-side functions). " +
            "Once you have called this tool, stop and do not call any more tools because you need to wait for the user to set up the integration.";
        this.schema = addIntegrationSchema;
    }
    async _call(args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args },
        });
        this.agentContext.streamWriter.write({
            type: "tool_end",
            data: {
                tool: this.name,
                result: `Integration prompt for ${args.provider} displayed`,
            },
        });
        return `Integration prompt for ${args.provider} displayed. The user can set up the integration in the UI. Once connected, tools like execute_sql, get_supabase_project_info, and get_supabase_table_schema will be available.`;
    }
}
exports.AddIntegrationTool = AddIntegrationTool;
//# sourceMappingURL=add_integration.js.map