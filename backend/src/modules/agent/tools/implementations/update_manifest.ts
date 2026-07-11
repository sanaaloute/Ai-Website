/**
 * Update Manifest Tool
 * Updates the file state tracker manifest after file operations.
 */

import { z } from "zod";
import { AgentTool } from "../types";

const updateManifestSchema = z.object({
  file_path: z.string().describe("Path of the file that was changed"),
  operation: z
    .enum(["created", "modified", "deleted"])
    .describe("The type of operation performed on the file"),
});

export class UpdateManifestTool extends AgentTool {
  name = "update_manifest";
  description = `Update the file state tracker manifest to record a file operation.

Use this after creating, modifying, or deleting a file to keep the manifest in sync.

Operations:
- "created": File was newly created
- "modified": Existing file was edited
- "deleted": File was removed`;
  schema = updateManifestSchema;

  async _call(args: z.infer<typeof updateManifestSchema>): Promise<string> {
    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args: { file_path: args.file_path, operation: args.operation } },
    });

    const tracker = this.agentContext.fileManifest;

    try {
      await tracker.updateFile(args.file_path, args.operation);
      const msg = `Manifest updated: ${args.file_path} → ${args.operation}`;
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: msg },
      });
      return msg;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${errMsg}` },
      });
      return `Error: ${errMsg}`;
    }
  }
}
