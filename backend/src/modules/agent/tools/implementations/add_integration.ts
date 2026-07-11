import { z } from "zod";
import { AgentTool } from "../types";

const SUPPORTED_PROVIDERS = ["supabase"] as const;

const addIntegrationSchema = z.object({
  provider: z
    .enum(SUPPORTED_PROVIDERS)
    .describe("The integration provider to add (e.g., 'supabase')"),
});

export class AddIntegrationTool extends AgentTool {
  name = "add_integration";
  description =
    "Add an integration provider to the app (e.g., Supabase for auth, database, or server-side functions). " +
    "Once you have called this tool, stop and do not call any more tools because you need to wait for the user to set up the integration.";
  schema = addIntegrationSchema;

  async _call(
    args: z.infer<typeof addIntegrationSchema>
  ): Promise<string> {
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
