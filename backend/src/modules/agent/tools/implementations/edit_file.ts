import { z } from "zod";
import { AgentTool } from "../types";
import { upsertFile } from "@/lib/db/project-store";
import { normalizeFilePath, ensureTypeScriptExtension } from "../file-manifest";
import { DeterministicToolError } from "../errors";
import { createFileUpdateEvent } from "../stream-writer";

const editFileSchema = z.object({
  path: z.string().describe("The file path relative to the app root"),
  content: z.string().describe(
    "The updated code snippet to apply. Use // ... existing code ... comments to indicate unchanged sections. " +
    "For example:\n" +
    "// ... existing code ...\n" +
    "const myFunction = () => {\n" +
    "  // ... existing code ...\n" +
    "  return newValue;\n" +
    "};\n" +
    "// ... existing code ..."
  ),
  instructions: z
    .string()
    .optional()
    .describe("A brief description of what the edit does"),
});

/**
 * Apply an edit to a file using // ... existing code ... markers.
 *
 * The edit content alternates between context anchors (code that exists in the
 * original file) and replacement content. Markers indicate which sections are
 * unchanged.
 */
function needsNewlineBetween(left: string, right: string): boolean {
  if (!left || !right) return false;
  const leftEndsWithWhitespace = /\s$/.test(left);
  const rightStartsWithWhitespace = /^\s/.test(right);
  return !leftEndsWithWhitespace && !rightStartsWithWhitespace;
}

function applyFileEdit(original: string, editContent: string): string {
  const MARKER = /\/\/\s*\.\.\.\s*existing code\s*\.\.\.\s*/g;
  let parts = editContent.split(MARKER);

  // Trim each part
  parts = parts.map((p) => p.trim());

  // Remove empty parts from beginning and end
  while (parts.length > 0 && parts[0] === "") parts.shift();
  while (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();

  if (parts.length === 0) return original;
  if (parts.length === 1) return parts[0];

  let result = original;
  let searchOffset = 0;

  // Process overlapping triplets: (anchor_before, replacement, anchor_after)
  for (let i = 0; i < parts.length - 1; i += 2) {
    const beforeAnchor = parts[i];
    const replacement = parts[i + 1] ?? "";
    const afterAnchor = parts[i + 2] ?? "";

    // Find beforeAnchor in result
    let beforeIndex = findInText(result, beforeAnchor, searchOffset);
    if (beforeIndex === -1) {
      throw new DeterministicToolError(
        `Could not find edit anchor in original file. Looking for: "${beforeAnchor.slice(
          0,
          80
        )}..."`
      );
    }

    if (afterAnchor) {
      // Find afterAnchor after beforeAnchor
      let afterIndex = findInText(
        result,
        afterAnchor,
        beforeIndex + beforeAnchor.length
      );
      if (afterIndex === -1) {
        throw new DeterministicToolError(
          `Could not find edit anchor in original file. Looking for: "${afterAnchor.slice(
            0,
            80
          )}..."`
        );
      }

      // Replace content between beforeAnchor and afterAnchor with replacement
      const prefix = result.slice(0, beforeIndex + beforeAnchor.length);
      const suffix = result.slice(afterIndex);
      const sepBefore = needsNewlineBetween(prefix, replacement) ? "\n" : "";
      const sepAfter = needsNewlineBetween(replacement, suffix) ? "\n" : "";
      result = prefix + sepBefore + replacement + sepAfter + suffix;

      searchOffset = prefix.length + sepBefore.length + replacement.length + sepAfter.length;
    } else {
      // No afterAnchor - replace from after beforeAnchor to end
      const prefix = result.slice(0, beforeIndex + beforeAnchor.length);
      const sepBefore = needsNewlineBetween(prefix, replacement) ? "\n" : "";
      result = prefix + sepBefore + replacement;
      searchOffset = result.length;
    }
  }

  return result;
}

/**
 * Find a substring in text, with fallback to line-based approximate matching.
 */
function findInText(
  text: string,
  search: string,
  startIndex: number
): number {
  // Try exact match first
  const exact = text.indexOf(search, startIndex);
  if (exact !== -1) return exact;

  // Try line-based matching
  const searchLines = search.split("\n").filter((l) => l.trim());
  if (searchLines.length === 0) return startIndex;

  const prefix = text.slice(0, startIndex);
  const textLines = text.slice(startIndex).split("\n");

  for (let i = 0; i < textLines.length; i++) {
    let matches = 0;
    for (
      let j = 0;
      j < searchLines.length && i + j < textLines.length;
      j++
    ) {
      const searchLine = searchLines[j].trim();
      const textLine = textLines[i + j].trim();
      if (
        textLine.includes(searchLine) ||
        searchLine.includes(textLine) ||
        levenshteinSimilarity(textLine, searchLine) > 0.7
      ) {
        matches++;
      }
    }
    if (matches >= Math.max(1, searchLines.length * 0.5)) {
      const before = textLines.slice(0, i).join("\n");
      return startIndex + before.length + (i > 0 ? 1 : 0);
    }
  }

  return -1;
}

/**
 * Calculate similarity between two strings using Levenshtein distance.
 */
function levenshteinSimilarity(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

export class EditFileTool extends AgentTool {
  name = "edit_file";
  description =
    "Edit an existing file by providing a mix of unchanged context and new code. " +
    "Use // ... existing code ... comments to mark sections that stay the same. " +
    "Best for medium-sized changes (one function or section). " +
    "For small changes (1-3 lines), prefer search_replace. For large rewrites, prefer write_file.";
  schema = editFileSchema;

  async _call(args: z.infer<typeof editFileSchema>): Promise<string> {
    const tsPath = ensureTypeScriptExtension(args.path);
    const extensionChanged = tsPath !== args.path;
    const normalizedPath = normalizeFilePath(tsPath);

    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args: { path: normalizedPath, instructions: args.instructions } },
    });

    // Enforce protected config files
    if (this.agentContext.fileManifest.isProtected(normalizedPath)) {
      const error = `Cannot edit protected file: ${normalizedPath}. This file is critical to the sandbox environment and cannot be modified.`;
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${error}` },
      });
      throw new DeterministicToolError(error);
    }

    let originalContent = "";
    try {
      originalContent = await this.agentContext.sandboxProvider.readFile(
        normalizedPath
      );

      const newContent = applyFileEdit(originalContent, args.content);

      this.updateTodosForPath(normalizedPath, 'in_progress');
      await this.agentContext.sandboxProvider.writeFile(normalizedPath, newContent);
      this.updateTodosForPath(normalizedPath, 'completed');

      // Persist to local SQLite if project is tracked
      if (this.agentContext.supabaseProjectId) {
        try {
          upsertFile(this.agentContext.supabaseProjectId, normalizedPath, newContent);
        } catch (err) {
          console.warn(`[edit_file] SQLite persist failed for ${normalizedPath}:`, err);
        }
      }

      this.agentContext.streamWriter.write(
        createFileUpdateEvent(normalizedPath, newContent, "modified"),
      );

      // Update file state tracker manifest
      try {
        await this.agentContext.fileManifest.updateFile(normalizedPath, "modified");
      } catch (err) {
        console.warn(`[edit_file] Manifest update failed for ${normalizedPath}:`, err);
      }

      const extensionNotice = extensionChanged
        ? ` (note: path was corrected from ${args.path} to ${normalizedPath} because this project uses TypeScript)`
        : "";

      // Validate syntax for TS/TSX files (run with project config so path aliases resolve)
      let syntaxResult = "";
      let hasSyntaxError = false;
      if (normalizedPath.endsWith(".ts") || normalizedPath.endsWith(".tsx")) {
        const check = await this.agentContext.sandboxProvider.runCommand(
          `cd /home/user/app && npx tsc --noEmit --skipLibCheck --project tsconfig.app.json`,
          undefined,
          { timeoutMs: 2 * 60 * 1000 }
        );
        if (!check.success) {
          const err = check.stderr || check.stdout || "";
          if (err.includes("error TS")) {
            hasSyntaxError = true;
            syntaxResult = `\n\nTypeScript check:\n${err}`;
          }
        }
      }

      // If syntax errors were introduced, REVERT the file to prevent Vite crashes
      if (hasSyntaxError) {
        console.error(`[edit_file] Syntax error detected in ${normalizedPath}. Reverting to original.`);
        await this.agentContext.sandboxProvider.writeFile(normalizedPath, originalContent);
        // The file_update with the new content already went out — send a
        // corrective event so the frontend doesn't keep showing code that no
        // longer exists in the sandbox.
        this.agentContext.streamWriter.write(
          createFileUpdateEvent(normalizedPath, originalContent, "modified"),
        );
        // Also revert SQLite
        if (this.agentContext.supabaseProjectId) {
          try {
            upsertFile(this.agentContext.supabaseProjectId, normalizedPath, originalContent);
          } catch { /* ignore */ }
        }
        throw new Error(
          `Edited ${normalizedPath} but the change introduced syntax errors. The file has been reverted to its original state.\n${syntaxResult}\n\nPlease fix the edit and try again.`
        );
      }

      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Edited ${normalizedPath}${extensionNotice}${syntaxResult}` },
      });

      return `Successfully edited ${normalizedPath}${extensionNotice}${syntaxResult}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      // Keep the deterministic classification — anchor misses must not be retried.
      if (error instanceof DeterministicToolError) throw error;
      throw new Error(`Failed to edit ${normalizedPath}: ${message}`);
    }
  }
}
