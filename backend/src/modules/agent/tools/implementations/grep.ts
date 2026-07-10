import { z } from "zod";
import { AgentTool } from "../types";

const grepSchema = z.object({
  query: z.string().describe("The regex pattern to search for"),
  include_pattern: z
    .string()
    .optional()
    .describe(
      "Glob pattern for files to include (e.g. '*.ts' for TypeScript files)"
    ),
  exclude_pattern: z
    .string()
    .optional()
    .describe("Glob pattern for files to exclude"),
  case_sensitive: z
    .boolean()
    .optional()
    .describe("Whether the search should be case sensitive (default: false)"),
  limit: z
    .number()
    .min(1)
    .max(250)
    .optional()
    .describe(
      "Maximum number of matches to return (default: 100, max: 250). Use include_pattern to narrow results if limit is reached."
    ),
});

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 250;

export class GrepTool extends AgentTool {
  name = "grep";
  description = `Search for a regex pattern in the codebase using grep.

- Returns matching lines with file paths and line numbers
- By default, the search is case-insensitive
- Use include_pattern to filter by file type (e.g. '*.tsx')
- Use exclude_pattern to skip certain files (e.g. '*.test.ts')
- Results are limited to ${DEFAULT_LIMIT} matches by default (max ${MAX_LIMIT}). If results are truncated, narrow your search with include_pattern or a more specific query.`;
  schema = grepSchema;

  async _call(args: z.infer<typeof grepSchema>): Promise<string> {
    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args: { query: args.query } },
    });

    try {
      const flags: string[] = [];
      if (!args.case_sensitive) {
        flags.push("-i");
      }
      flags.push("-r");
      flags.push("-n");
      flags.push("--include");
      flags.push(args.include_pattern || "*");
      if (args.exclude_pattern) {
        flags.push("--exclude");
        flags.push(args.exclude_pattern);
      }
      flags.push("-I"); // Ignore binary files

      const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

      // Build the grep command (no pipes - runCommand uses subprocess without shell)
      const grepArgs = [...flags, "-e", args.query, "."];
      const grepCmd = ["grep", ...grepArgs].join(" ");

      const result = await this.agentContext.sandboxProvider.runCommand(grepCmd);

      let output = result.stdout;
      if (result.stderr && !result.success) {
        // grep exits with code 1 when no matches, which is fine
        if (!output) {
          output = "No matches found.";
        }
      }

      if (!output.trim()) {
        output = "No matches found.";
      }

      const lines = output.split("\n").filter((l) => l.trim());
      const wasTruncated = lines.length > limit;
      const resultLines = wasTruncated ? lines.slice(0, limit) : lines;

      let formatted = resultLines.join("\n");
      if (wasTruncated) {
        formatted += `\n\n[TRUNCATED: Showing ${limit} matches. Use include_pattern to narrow your search (e.g., include_pattern="*.tsx") or use a more specific query.]`;
      }

      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Found ${resultLines.length} matches` },
      });

      return formatted;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      return `Search error: ${message}`;
    }
  }
}
