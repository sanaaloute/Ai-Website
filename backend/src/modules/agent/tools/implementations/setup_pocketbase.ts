import { z } from "zod";
import { AgentTool } from "../types";

const setupPocketBaseSchema = z.object({
  templateId: z
    .string()
    .optional()
    .describe(
      "Label only — echoed back in the status summary. Templates are applied automatically when the project template is selected; this parameter does NOT apply, create, or migrate anything."
    ),
});

export class SetupPocketBaseTool extends AgentTool {
  name = "setup_pocketbase";
  description =
    "Check the running PocketBase backend status (URL, existing collections, seeded records). This does NOT create, migrate, or reconfigure collections; schema setup is handled automatically when the project template is selected."; 
  schema = setupPocketBaseSchema;

  async _call(args: z.infer<typeof setupPocketBaseSchema>): Promise<string> {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      throw new Error(`Failed to setup PocketBase: ${message}`);
    }
  }
}
