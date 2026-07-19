"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecuteSqlTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const executeSqlSchema = zod_1.z.object({
    query: zod_1.z.string().describe("The SQL query to execute"),
    description: zod_1.z.string().optional().describe("Brief description of the query"),
});
class ExecuteSqlTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "execute_sql";
        this.description = "Validate and stage a SQL query for the connected Supabase project. " +
            "IMPORTANT: this tool does NOT execute the query — live execution requires a Supabase Management API token that is not configured. " +
            "It returns the query text for review only. Never assume rows were returned, inserted, or modified; do not fabricate query results.";
        this.schema = executeSqlSchema;
    }
    async _call(args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { description: args.description } },
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
        try {
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: {
                    tool: this.name,
                    result: `SQL query ready for execution`,
                },
            });
            return `SQL query prepared for execution on Supabase project ${this.agentContext.supabaseProjectId}:\n\n${args.query}\n\nNote: Full execution requires a Management API access token to be configured.`;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${message}` },
            });
            throw new Error(`Failed to execute SQL: ${message}`);
        }
    }
}
exports.ExecuteSqlTool = ExecuteSqlTool;
//# sourceMappingURL=execute_sql.js.map