/**
 * Query Manifest Tool
 * Allows agents to query the file state tracker manifest.
 */

import { z } from "zod";
import { AgentTool } from "../types";

const queryManifestSchema = z.object({
  action: z
    .enum(["get_file_status", "list_changed", "is_protected"])
    .describe("The query action to perform"),
  file_path: z
    .string()
    .optional()
    .describe("File path (required for get_file_status and is_protected)"),
});

export class QueryManifestTool extends AgentTool {
  name = "query_manifest";
  description = `Query the file state tracker manifest to check file statuses, list changed files, or verify protected paths.

Actions:
- "get_file_status": Check if a file exists in the manifest and its status (created/modified/deleted)
- "list_changed": List all files that have been created, modified, or deleted in this session
- "is_protected": Check if a file path is protected (e.g., vite.config.ts, package.json)`;
  schema = queryManifestSchema;

  async _call(args: z.infer<typeof queryManifestSchema>): Promise<string> {
    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args: { action: args.action, file_path: args.file_path } },
    });

    const tracker = this.agentContext.fileManifest;
    let result: Record<string, unknown>;

    try {
      switch (args.action) {
        case "get_file_status": {
          if (!args.file_path) {
            throw new Error("file_path is required for get_file_status");
          }
          const status = tracker.getFileStatus(args.file_path);
          result = { success: true, ...status };
          break;
        }
        case "list_changed": {
          const files = tracker.listChanged();
          result = { success: true, files, count: files.length };
          break;
        }
        case "is_protected": {
          if (!args.file_path) {
            throw new Error("file_path is required for is_protected");
          }
          const protected_ = tracker.isProtected(args.file_path);
          result = { success: true, protected: protected_, file_path: args.file_path };
          break;
        }
        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${errMsg}` },
      });
      return `Error: ${errMsg}`;
    }

    const resultStr = JSON.stringify(result, null, 2);
    this.agentContext.streamWriter.write({
      type: "tool_end",
      data: { tool: this.name, result: resultStr },
    });
    return resultStr;
  }
}
