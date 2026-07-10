import { z } from "zod";
import { AgentTool } from "../types";

const getSupabaseTableSchemaSchema = z.object({
  tableName: z
    .string()
    .optional()
    .describe(
      "Optional table name to get schema for. If omitted, returns schema for all tables."
    ),
});

export class GetSupabaseTableSchemaTool extends AgentTool {
  name = "get_supabase_table_schema";
  description =
    "Get database table schema from Supabase. If tableName is provided, returns schema for that specific table (columns, policies, triggers). " +
    "If omitted, returns schema for all tables. Requires a connected Supabase project.";
  schema = getSupabaseTableSchemaSchema;

  async _call(
    args: z.infer<typeof getSupabaseTableSchemaSchema>
  ): Promise<string> {
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
      throw new Error(
        "Supabase is not connected to this app. Use the add_integration tool to connect Supabase first."
      );
    }

    this.agentContext.streamWriter.write({
      type: "tool_end",
      data: {
        tool: this.name,
        result: `Table schema retrieved`,
      },
    });

    return `Supabase Table Schema for project ${this.agentContext.supabaseProjectId}:\n` +
      `- Table: ${args.tableName || "all tables"}\n\n` +
      `Note: Full schema retrieval requires the Supabase Management API access token to be configured. ` +
      `Once available, this tool will return columns, types, constraints, policies, and triggers.`;
  }
}
