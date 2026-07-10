import { z } from "zod";
import { AgentTool } from "../types";
import { deleteFile as deleteFileFromStore } from "@/lib/db/project-store";
import { normalizeFilePath } from "../file-manifest";

const deleteFileSchema = z.object({
  path: z.string().describe("The file path to delete"),
});

export class DeleteFileTool extends AgentTool {
  name = "delete_file";
  description =
    "Permanently delete a file or directory from the codebase. " +
    "Use this when a file is no longer needed (e.g., after refactoring, removing unused components, " +
    "or cleaning up temporary files). The deletion is also removed from local persistent storage. " +
    "Be careful — this action cannot be undone.";
  schema = deleteFileSchema;

  async _call(args: z.infer<typeof deleteFileSchema>): Promise<string> {
    const normalizedPath = normalizeFilePath(args.path);

    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args: { path: normalizedPath } },
    });

    // Enforce protected config files
    if (this.agentContext.fileManifest.isProtected(normalizedPath)) {
      const error = `Cannot delete protected file: ${normalizedPath}. This file is critical to the sandbox environment and cannot be removed.`;
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${error}` },
      });
      throw new Error(error);
    }

    try {
      const result = await this.agentContext.sandboxProvider.runCommand(
        `rm -rf ${normalizedPath}`
      );

      if (!result.success) {
        throw new Error(result.stderr || `Failed to delete ${args.path}`);
      }

      // Remove from local SQLite if project is tracked
      if (this.agentContext.supabaseProjectId) {
        try {
          deleteFileFromStore(this.agentContext.supabaseProjectId, normalizedPath);
        } catch (err) {
          console.warn(`[delete_file] SQLite delete failed for ${normalizedPath}:`, err);
        }
      }

      // Update file state tracker manifest
      try {
        await this.agentContext.fileManifest.updateFile(normalizedPath, "deleted");
      } catch (err) {
        console.warn(`[delete_file] Manifest update failed for ${normalizedPath}:`, err);
      }

      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Deleted ${normalizedPath}` },
      });

      return `Successfully deleted ${normalizedPath}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      throw new Error(`Failed to delete ${normalizedPath}: ${message}`);
    }
  }
}
