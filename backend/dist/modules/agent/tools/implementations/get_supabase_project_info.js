"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetSupabaseProjectInfoTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const getSupabaseProjectInfoSchema = zod_1.z.object({
    includeDbFunctions: zod_1.z
        .boolean()
        .optional()
        .describe("When true, includes database functions in the response. Defaults to false."),
});
class GetSupabaseProjectInfoTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "get_supabase_project_info";
        this.description = "Get basic identifiers of the connected Supabase project (project ID and organization slug only). " +
            "NOTE: publishable keys, secret names, and table listings are NOT available — they require a Supabase Management API token that is not configured. " +
            "Do not call this expecting table names; discover the schema from the codebase instead. Requires a connected Supabase project.";
        this.schema = getSupabaseProjectInfoSchema;
    }
    async _call(args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args },
        });
        if (!this.agentContext.supabaseProjectId) {
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: {
                    tool: this.name,
                    result: "Supabase is not connected",
                },
            });
            throw new Error("Supabase is not connected to this app. Use the add_integration tool to connect Supabase first.");
        }
        this.agentContext.streamWriter.write({
            type: "tool_end",
            data: {
                tool: this.name,
                result: `Project info retrieved`,
            },
        });
        return `Supabase Project Info for ${this.agentContext.supabaseProjectId}:\n` +
            `- Project ID: ${this.agentContext.supabaseProjectId}\n` +
            `- Organization: ${this.agentContext.supabaseOrganizationSlug || "N/A"}\n` +
            `- Include DB Functions: ${args.includeDbFunctions ?? false}\n\n` +
            `Note: Full project info requires the Supabase Management API access token to be configured.`;
    }
}
exports.GetSupabaseProjectInfoTool = GetSupabaseProjectInfoTool;
//# sourceMappingURL=get_supabase_project_info.js.map