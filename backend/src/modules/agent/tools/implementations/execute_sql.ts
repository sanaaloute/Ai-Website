import { z } from "zod";
import { AgentTool } from "../types";

const executeSqlSchema = z.object({
  query: z.string().describe("The SQL query to execute"),
  description: z.string().optional().describe("Brief description of the query"),
});

export class ExecuteSqlTool extends AgentTool {
  name = "execute_sql";
  description =
    "Validate and stage a SQL query for the connected Supabase project. " +
    "IMPORTANT: this tool does NOT execute the query — live execution requires a Supabase Management API token that is not configured. " +
    "It returns the query text for review only. Never assume rows were returned, inserted, or modified; do not fabricate query results.";
  schema = executeSqlSchema;

  async _call(args: z.infer<typeof executeSqlSchema>): Promise<string> {
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
      throw new Error(
        "Supabase is not connected to this app. Use the add_integration tool to connect Supabase first."
      );
    }

    try {
      // For now, return a message indicating the query that would be executed.
      // Full implementation requires Supabase Management API access token
      // to call POST /v1/projects/{ref}/database/query
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: {
          tool: this.name,
          result: `SQL query ready for execution`,
        },
      });

      return `SQL query prepared for execution on Supabase project ${this.agentContext.supabaseProjectId}:\n\n${args.query}\n\nNote: Full execution requires a Management API access token to be configured.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      throw new Error(`Failed to execute SQL: ${message}`);
    }
  }
}
