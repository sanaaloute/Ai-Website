import { z } from "zod";
import { AgentTool } from "../types";

const getSupabaseProjectInfoSchema = z.object({
  includeDbFunctions: z
    .boolean()
    .optional()
    .describe(
      "When true, includes database functions in the response. Defaults to false."
    ),
});

export class GetSupabaseProjectInfoTool extends AgentTool {
  name = "get_supabase_project_info";
  description =
    "Get basic identifiers of the connected Supabase project (project ID and organization slug only). " +
    "NOTE: publishable keys, secret names, and table listings are NOT available — they require a Supabase Management API token that is not configured. " +
    "Do not call this expecting table names; discover the schema from the codebase instead. Requires a connected Supabase project.";
  schema = getSupabaseProjectInfoSchema;

  async _call(
    args: z.infer<typeof getSupabaseProjectInfoSchema>
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
