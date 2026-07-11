import { z } from "zod";
import { AgentTool } from "../types";
import { normalizeFilePath } from "../file-manifest";

const renameFileSchema = z.object({
  from: z.string().describe("The current file path"),
  to: z.string().describe("The new file path"),
});

export class RenameFileTool extends AgentTool {
  name = "rename_file";
  description =
    "Rename or move a file to a different path in the codebase. " +
    "Use this when refactoring file organization (e.g., moving components to a different folder, " +
    "renaming files to match naming conventions, or reorganizing the project structure). " +
    "The file content is preserved and the new location is persisted to local storage.";
  schema = renameFileSchema;

  async _call(args: z.infer<typeof renameFileSchema>): Promise<string> {
    const normalizedFrom = normalizeFilePath(args.from);
    const normalizedTo = normalizeFilePath(args.to);

    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args: { from: normalizedFrom, to: normalizedTo } },
    });

    // Enforce protected config files
    if (this.agentContext.fileManifest.isProtected(normalizedFrom)) {
      const error = `Cannot rename protected file: ${normalizedFrom}. This file is critical to the sandbox environment and cannot be moved.`;
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${error}` },
      });
      throw new Error(error);
    }
    if (this.agentContext.fileManifest.isProtected(normalizedTo)) {
      const error = `Cannot rename to protected path: ${normalizedTo}. This path is reserved for critical sandbox files.`;
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${error}` },
      });
      throw new Error(error);
    }

    try {
      const content = await this.agentContext.sandboxProvider.readFile(
        normalizedFrom
      );
      await this.agentContext.sandboxProvider.writeFile(normalizedTo, content);
      await this.agentContext.sandboxProvider.runCommand(`rm -f ${normalizedFrom}`);

      // Update file state tracker manifest
      try {
        await this.agentContext.fileManifest.updateFile(normalizedFrom, "deleted");
        await this.agentContext.fileManifest.updateFile(normalizedTo, "created");
      } catch (err) {
        console.warn(`[rename_file] Manifest update failed:`, err);
      }

      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: {
          tool: this.name,
          result: `Renamed ${normalizedFrom} to ${normalizedTo}`,
        },
      });

      return `Successfully renamed ${normalizedFrom} to ${normalizedTo}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      throw new Error(`Failed to rename file: ${message}`);
    }
  }
}
