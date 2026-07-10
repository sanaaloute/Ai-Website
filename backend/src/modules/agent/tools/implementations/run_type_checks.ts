import { z } from "zod";
import { AgentTool } from "../types";

const runTypeChecksSchema = z.object({
  path: z
    .string()
    .optional()
    .describe("Optional path to run type checks on (default: entire project)"),
});

export class RunTypeChecksTool extends AgentTool {
  name = "run_type_checks";
  description =
    "Run TypeScript type checks (tsc --noEmit) to verify code correctness. Use after making changes to catch type errors.";
  schema = runTypeChecksSchema;

  async _call(args: z.infer<typeof runTypeChecksSchema>): Promise<string> {
    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args },
    });

    try {
      // Run the project type check using the app TS config so path aliases resolve.
      const cmd = "npx tsc --noEmit --skipLibCheck --project tsconfig.app.json";

      const result = await this.agentContext.sandboxProvider.runCommand(cmd, '/home/user/app');

      const output = result.stdout || result.stderr || "";
      const summary = result.success
        ? "Type check passed with no errors."
        : `Type check failed with exit code ${result.exitCode}.`;

      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: summary },
      });

      return `${summary}\n\n${output}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      return `Type check error: ${message}`;
    }
  }
}
