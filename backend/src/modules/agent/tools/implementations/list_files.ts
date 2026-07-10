import { z } from "zod";
import { AgentTool } from "../types";

const WORKSPACE_ROOT = "/home/user/app";

/** Resolve any user-provided path to an absolute path inside the workspace. */
function resolveWorkspacePath(dir: string | undefined): string {
  if (!dir || dir === "." || dir === "./") {
    return WORKSPACE_ROOT;
  }
  // If already absolute under workspace, use as-is
  if (dir.startsWith(WORKSPACE_ROOT)) {
    return dir.replace(/\/$/, "");
  }
  // If absolute outside workspace, clamp to workspace root
  if (dir.startsWith("/")) {
    return WORKSPACE_ROOT;
  }
  // Relative path — resolve under workspace
  return `${WORKSPACE_ROOT}/${dir.replace(/^\.\//, "").replace(/\/$/, "")}`;
}

const listFilesSchema = z.object({
  directory: z.string().optional().describe("Optional subdirectory to list (e.g. 'src/components')"),
  recursive: z
    .boolean()
    .optional()
    .describe("Whether to list files recursively (default: false)"),
});

export class ListFilesTool extends AgentTool {
  name = "list_files";
  description =
    "List files in the application workspace. By default, lists only the immediate directory contents. Use recursive=true to list all files recursively. Only sees files inside /home/user/app — never system files.";
  schema = listFilesSchema;

  async _call(args: z.infer<typeof listFilesSchema>): Promise<string> {
    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args },
    });

    try {
      const dir = resolveWorkspacePath(args.directory);
      const files = await this.agentContext.sandboxProvider.listFiles(dir);
      console.log(`[list_files] Listed ${files.length} files in ${dir}, first 10:`, files.slice(0, 10));

      // If not recursive, filter to immediate children only
      let result = files;
      if (!args.recursive) {
        const prefix = dir === WORKSPACE_ROOT ? "" : dir.replace(`${WORKSPACE_ROOT}/`, "") + "/";
        const seen = new Set<string>();
        result = [];
        for (const f of files) {
          const relative = f.startsWith(prefix) ? f.slice(prefix.length) : f;
          const topLevel = relative.split("/")[0];
          if (topLevel && !seen.has(topLevel)) {
            seen.add(topLevel);
            result.push(topLevel);
          }
        }
      }

      result.sort();

      const output = result.map((f) => ` - ${f}`).join("\n") || "(no files)";

      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Listed ${result.length} items` },
      });

      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      throw new Error(`Failed to list files: ${message}`);
    }
  }
}
