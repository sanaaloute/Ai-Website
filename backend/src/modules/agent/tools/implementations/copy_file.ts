import { z } from "zod";
import { AgentTool } from "../types";
import { normalizeFilePath } from "../file-manifest";
import { createFileUpdateEvent } from "../stream-writer";

const copyFileSchema = z.object({
  from: z.string().describe("The source file path (relative to /home/user/app)"),
  to: z.string().describe("The destination file path (relative to /home/user/app)"),
});

export class CopyFileTool extends AgentTool {
  name = "copy_file";
  description =
    "Copy a file to a new location in the codebase. " +
    "Use this when you need to duplicate a file (e.g., creating a new page based on an existing template, " +
    "or copying a component to modify it for a different use case). " +
    "Both paths are relative to /home/user/app. " +
    "The new file is automatically persisted to local storage.";
  schema = copyFileSchema;

  async _call(args: z.infer<typeof copyFileSchema>): Promise<string> {
    const normalizedFrom = normalizeFilePath(args.from);
    const normalizedTo = normalizeFilePath(args.to);

    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args: { from: normalizedFrom, to: normalizedTo } },
    });

    // Enforce protected config files on destination
    if (this.agentContext.fileManifest.isProtected(normalizedTo)) {
      const error = `Cannot copy to protected path: ${normalizedTo}. This path is reserved for critical sandbox files.`;
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${error}` },
      });
      throw new Error(error);
    }

    try {
      const content = await this.agentContext.sandboxProvider.readFile(normalizedFrom);
      await this.agentContext.sandboxProvider.writeFile(normalizedTo, content);

      this.agentContext.streamWriter.write(
        createFileUpdateEvent(normalizedTo, content, "created"),
      );

      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Copied ${normalizedFrom} to ${normalizedTo}` },
      });

      return `Successfully copied ${normalizedFrom} to ${normalizedTo}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      throw new Error(`Failed to copy file: ${message}`);
    }
  }
}
