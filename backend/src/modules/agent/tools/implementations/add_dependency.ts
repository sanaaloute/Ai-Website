import { z } from "zod";
import { AgentTool } from "../types";

const addDependencySchema = z.object({
  package: z.string().describe("The npm package name to install"),
  version: z
    .string()
    .optional()
    .describe("Optional version constraint (e.g. '^1.0.0')"),
  dev: z
    .boolean()
    .optional()
    .describe("Whether to install as a dev dependency"),
});

export class AddDependencyTool extends AgentTool {
  name = "add_dependency";
  description =
    "Add an npm package dependency to the project. Records the package in package.json; dependencies are installed in bulk during finalization.";
  schema = addDependencySchema;

  async _call(args: z.infer<typeof addDependencySchema>): Promise<string> {
    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args: { package: args.package } },
    });

    const section = args.dev ? "devDependencies" : "dependencies";
    const versionSpec = args.version || "*";
    const pkgDisplay = args.version
      ? `${args.package}@${args.version}`
      : args.package;

    try {
      this.agentContext.streamWriter.write({
        type: "tool_progress",
        data: { tool: this.name, message: `Recording ${pkgDisplay}...` },
      });

      // Read and mutate package.json directly. This avoids shell-escaping issues
      // and keeps the executor loop fast — npm install is deferred to finalizeNode.
      const raw = await this.agentContext.sandboxProvider.readFile("package.json");
      const pkgJson = JSON.parse(raw) as Record<string, unknown>;
      const existing = (pkgJson[section] as Record<string, string> | undefined) ?? {};
      pkgJson[section] = { ...existing, [args.package]: versionSpec };
      await this.agentContext.sandboxProvider.writeFile(
        "package.json",
        JSON.stringify(pkgJson, null, 2) + "\n",
      );

      this.agentContext.streamWriter.write({
        type: "tool_progress",
        data: { tool: this.name, message: `Recorded ${pkgDisplay}`, percent: 100 },
      });

      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Recorded ${pkgDisplay}` },
      });

      return `Successfully recorded ${pkgDisplay} for installation`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_progress",
        data: { tool: this.name, message: `Failed to record ${pkgDisplay}: ${message}` },
      });
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      throw new Error(`Failed to add dependency: ${message}`);
    }
  }
}
