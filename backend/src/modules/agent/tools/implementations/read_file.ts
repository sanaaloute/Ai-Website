import { z } from "zod";
import { AgentTool } from "../types";
import { normalizeFilePath } from "../file-manifest";

const WORKSPACE_ROOT = "/home/user/app";

/**
 * Resolve any user-provided path to an absolute path inside the workspace.
 * normalizeFilePath throws on `..` traversal, so reads cannot escape it.
 */
function resolveWorkspacePath(inputPath: string): string {
  return `${WORKSPACE_ROOT}/${normalizeFilePath(inputPath)}`;
}

const readFileSchema = z.object({
  path: z.string().describe("The file path to read (relative to /home/user/app or absolute)"),
  start_line_one_indexed: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("The one-indexed line number to start reading from (inclusive)."),
  end_line_one_indexed_inclusive: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("The one-indexed line number to end reading at (inclusive)."),
});

export class ReadFileTool extends AgentTool {
  name = "read_file";
  description = `Read the content of a file from the application workspace (/home/user/app).
  
- You have the capability to call multiple tools in a single response. It is always better to speculatively read multiple files as a batch that are potentially useful.`;
  schema = readFileSchema;

  async _call(args: z.infer<typeof readFileSchema>): Promise<string> {
    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args },
    });

    const resolvedPath = resolveWorkspacePath(args.path);
    console.log(`[read_file] Model requested: ${args.path} → resolved: ${resolvedPath}`);

    try {
      const content = await this.agentContext.sandboxProvider.readFile(
        resolvedPath
      );

      const start = args.start_line_one_indexed;
      const end = args.end_line_one_indexed_inclusive;

      let result = content;

      if (start != null || end != null) {
        const hasTrailingNewline = content.endsWith("\n");
        const lines = (hasTrailingNewline ? content.slice(0, -1) : content).split(
          "\n"
        );
        const startIdx = Math.max(0, (start ?? 1) - 1);
        const endIdx = Math.min(lines.length, end ?? lines.length);
        result = lines.slice(startIdx, endIdx).join("\n");
        if (endIdx >= lines.length && hasTrailingNewline) {
          result += "\n";
        }
      }

      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Read ${args.path}` },
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      throw new Error(`Failed to read ${resolvedPath}: ${message}`);
    }
  }
}
