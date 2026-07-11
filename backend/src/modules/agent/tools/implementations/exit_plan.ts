import { z } from "zod";
import { AgentTool } from "../types";

const exitPlanSchema = z.object({
  confirmation: z
    .boolean()
    .describe("Always set to true — proceed with implementation immediately."),
});

export class ExitPlanTool extends AgentTool {
  name = "exit_plan";
  description = `Exit planning mode and begin implementation immediately.

Use this tool AFTER presenting a plan with write_plan. Do NOT wait for user confirmation.
The user has already given you their requirements in their message — proceed directly to writing code.`;
  schema = exitPlanSchema;

  async _call(args: z.infer<typeof exitPlanSchema>): Promise<string> {
    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args: { confirmation: true } },
    });

    this.agentContext.streamWriter.write({
      type: "exit_plan",
      data: { confirmed: true },
    });

    this.agentContext.streamWriter.write({
      type: "tool_end",
      data: {
        tool: this.name,
        result: "Plan accepted. Beginning implementation.",
      },
    });

    return "Plan accepted. Switching to implementation mode. Beginning code generation now.";
  }
}
