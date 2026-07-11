import { z } from "zod";
import { AgentTool } from "../types";

const readLogsSchema = z.object({
  type: z
    .enum(["all", "client", "server", "build"])
    .optional()
    .describe(
      "Filter by log source type (default: all). 'server' = Vite dev server logs; 'build' = build output; 'client' = browser console (not available in sandbox); 'all' = all available logs."
    ),
  level: z
    .enum(["all", "info", "warn", "error"])
    .optional()
    .describe("Filter by log level (default: all)"),
  searchTerm: z
    .string()
    .optional()
    .describe("Search for logs containing this text (case-insensitive)"),
  limit: z
    .number()
    .min(1)
    .max(200)
    .optional()
    .describe("Maximum number of logs to return (default: 50, max: 200)"),
});

function truncateMessage(message: string, maxLength: number = 1000): string {
  if (message.length <= maxLength) {
    return message;
  }
  const halfLength = Math.floor((maxLength - 20) / 2);
  return (
    message.slice(0, halfLength) +
    "\n... [truncated] ...\n" +
    message.slice(-halfLength)
  );
}

export class ReadLogsTool extends AgentTool {
  name = "read_logs";
  description =
    "Read application logs from the sandbox. Use this to debug errors, investigate build failures, or understand app behavior. " +
    "Logs include Vite dev server output and build errors. " +
    "IMPORTANT: Logs are a snapshot from when you call this tool - they will NOT update while you are reading them.";
  schema = readLogsSchema;

  async _call(args: z.infer<typeof readLogsSchema>): Promise<string> {
    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args },
    });

    try {
      const logType = args.type ?? "all";
      const level = args.level ?? "all";
      const searchTerm = args.searchTerm?.toLowerCase();
      const limit = Math.min(args.limit ?? 50, 200);

      let logs: string[] = [];

      // Try to read dev server logs (Next.js or Vite)
      if (logType === "all" || logType === "server") {
        try {
          const result = await this.agentContext.sandboxProvider.runCommand(
            "cat /tmp/next.log /tmp/vite.log 2>/dev/null || echo ''"
          );
          if (result.stdout) {
            const lines = result.stdout.split("\n").filter((l) => l.trim());
            logs.push(...lines.map((l) => `[server] ${l}`));
          }
        } catch {
          // Ignore
        }
      }

      // Try to read build errors from a recent npm/vite build
      if (logType === "all" || logType === "build") {
        try {
          const result = await this.agentContext.sandboxProvider.runCommand(
            "cat /tmp/vite-errors.log 2>/dev/null || echo ''"
          );
          if (result.stdout) {
            const lines = result.stdout.split("\n").filter((l) => l.trim());
            logs.push(...lines.map((l) => `[build-error] ${l}`));
          }
        } catch {
          // Ignore
        }
      }

      if (logs.length === 0) {
        this.agentContext.streamWriter.write({
          type: "tool_end",
          data: { tool: this.name, result: "No logs found" },
        });
        return "No logs found in the sandbox.";
      }

      // Apply level filter
      if (level !== "all") {
        const levelMap: Record<string, string[]> = {
          info: ["info", "log", "debug"],
          warn: ["warn", "warning"],
          error: ["error", "fatal", "err"],
        };
        const levelTerms = levelMap[level] ?? [level];
        logs = logs.filter((log) =>
          levelTerms.some((term) => log.toLowerCase().includes(term))
        );
      }

      // Apply search term filter
      if (searchTerm) {
        logs = logs.filter((log) => log.toLowerCase().includes(searchTerm));
      }

      // Sort and limit (take most recent)
      logs = logs.slice(-limit);

      // Format output
      const formattedLogs =
        logs.length === 0
          ? "No logs found matching the specified filters."
          : logs.map((log) => truncateMessage(log)).join("\n");

      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: {
          tool: this.name,
          result: `Found ${logs.length} log entries`,
        },
      });

      return `Found ${logs.length} log entries:\n\n${formattedLogs}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      throw new Error(`Failed to read logs: ${message}`);
    }
  }
}
