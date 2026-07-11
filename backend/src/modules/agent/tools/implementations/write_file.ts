import { z } from "zod";
import { AgentTool } from "../types";
import { upsertFile } from "@/lib/db/project-store";
import { normalizeFilePath, ensureTypeScriptExtension } from "../file-manifest";
import { createFileUpdateEvent } from "../stream-writer";

const writeFileSchema = z.object({
  path: z.string().describe("The file path relative to the app root"),
  content: z.string().describe("The content to write to the file"),
  description: z
    .string()
    .optional()
    .describe("Brief description of the change"),
});

export class WriteFileTool extends AgentTool {
  name = "write_file";
  description =
    "Create a new file or completely overwrite an existing file. " +
    "Use this for: (1) creating new files, (2) complete rewrites where most of the file changes, " +
    "(3) when you don't have the exact existing content to match against. " +
    "For small surgical changes (1-3 lines), prefer search_replace. " +
    "For medium changes (one function/section), prefer edit_file. " +
    "Files are automatically persisted to local storage.";
  schema = writeFileSchema;

  async _call(args: z.infer<typeof writeFileSchema>): Promise<string> {
    const tsPath = ensureTypeScriptExtension(args.path);
    const extensionChanged = tsPath !== args.path;
    const normalizedPath = normalizeFilePath(tsPath);

    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args: { path: normalizedPath, description: args.description } },
    });

    // Enforce protected config files
    if (this.agentContext.fileManifest.isProtected(normalizedPath)) {
      const error = `Cannot write to protected file: ${normalizedPath}. This file is critical to the sandbox environment and cannot be modified.`;
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${error}` },
      });
      throw new Error(error);
    }

    try {
      this.updateTodosForPath(normalizedPath, 'in_progress');

      await this.agentContext.sandboxProvider.writeFile(
        normalizedPath,
        args.content
      );

      this.updateTodosForPath(normalizedPath, 'completed');

      // Persist to local SQLite if project is tracked
      if (this.agentContext.supabaseProjectId) {
        try {
          upsertFile(this.agentContext.supabaseProjectId, normalizedPath, args.content);
        } catch (err) {
          console.warn(`[write_file] SQLite persist failed for ${normalizedPath}:`, err);
        }
      }

      // Determine whether this is a create or a modify before emitting the
      // lightweight file_update event.
      let existing = false;
      try {
        existing = await this.agentContext.sandboxProvider.readFile(normalizedPath).then(() => true).catch(() => false);
      } catch {
        existing = false;
      }

      this.agentContext.streamWriter.write(
        createFileUpdateEvent(normalizedPath, args.content, existing ? "modified" : "created"),
      );

      // Update file state tracker manifest
      try {
        await this.agentContext.fileManifest.updateFile(normalizedPath, existing ? "modified" : "created");
      } catch (err) {
        console.warn(`[write_file] Manifest update failed for ${normalizedPath}:`, err);
      }

      const extensionNotice = extensionChanged
        ? ` (note: path was corrected from ${args.path} to ${normalizedPath} because this project uses TypeScript)`
        : "";

      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Wrote ${normalizedPath}${extensionNotice}` },
      });

      return `Successfully wrote ${normalizedPath}${extensionNotice}`;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error(`[write_file] Failed to write ${normalizedPath}: ${message}`);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      throw new Error(`Failed to write ${normalizedPath}: ${message}`);
    }
  }
}
