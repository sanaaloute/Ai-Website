"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditFileTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const project_store_1 = require("../../../../lib/db/project-store");
const file_manifest_1 = require("../file-manifest");
const stream_writer_1 = require("../stream-writer");
const editFileSchema = zod_1.z.object({
    path: zod_1.z.string().describe("The file path relative to the app root"),
    content: zod_1.z.string().describe("The updated code snippet to apply. Use // ... existing code ... comments to indicate unchanged sections. " +
        "For example:\n" +
        "// ... existing code ...\n" +
        "const myFunction = () => {\n" +
        "  // ... existing code ...\n" +
        "  return newValue;\n" +
        "};\n" +
        "// ... existing code ..."),
    instructions: zod_1.z
        .string()
        .optional()
        .describe("A brief description of what the edit does"),
});
function needsNewlineBetween(left, right) {
    if (!left || !right)
        return false;
    const leftEndsWithWhitespace = /\s$/.test(left);
    const rightStartsWithWhitespace = /^\s/.test(right);
    return !leftEndsWithWhitespace && !rightStartsWithWhitespace;
}
function applyFileEdit(original, editContent) {
    const MARKER = /\/\/\s*\.\.\.\s*existing code\s*\.\.\.\s*/g;
    let parts = editContent.split(MARKER);
    parts = parts.map((p) => p.trim());
    while (parts.length > 0 && parts[0] === "")
        parts.shift();
    while (parts.length > 0 && parts[parts.length - 1] === "")
        parts.pop();
    if (parts.length === 0)
        return original;
    if (parts.length === 1)
        return parts[0];
    let result = original;
    let searchOffset = 0;
    for (let i = 0; i < parts.length - 1; i += 2) {
        const beforeAnchor = parts[i];
        const replacement = parts[i + 1] ?? "";
        const afterAnchor = parts[i + 2] ?? "";
        let beforeIndex = findInText(result, beforeAnchor, searchOffset);
        if (beforeIndex === -1) {
            throw new Error(`Could not find edit anchor in original file. Looking for: "${beforeAnchor.slice(0, 80)}..."`);
        }
        if (afterAnchor) {
            let afterIndex = findInText(result, afterAnchor, beforeIndex + beforeAnchor.length);
            if (afterIndex === -1) {
                throw new Error(`Could not find edit anchor in original file. Looking for: "${afterAnchor.slice(0, 80)}..."`);
            }
            const prefix = result.slice(0, beforeIndex + beforeAnchor.length);
            const suffix = result.slice(afterIndex);
            const sepBefore = needsNewlineBetween(prefix, replacement) ? "\n" : "";
            const sepAfter = needsNewlineBetween(replacement, suffix) ? "\n" : "";
            result = prefix + sepBefore + replacement + sepAfter + suffix;
            searchOffset = prefix.length + sepBefore.length + replacement.length + sepAfter.length;
        }
        else {
            const prefix = result.slice(0, beforeIndex + beforeAnchor.length);
            const sepBefore = needsNewlineBetween(prefix, replacement) ? "\n" : "";
            result = prefix + sepBefore + replacement;
            searchOffset = result.length;
        }
    }
    return result;
}
function findInText(text, search, startIndex) {
    const exact = text.indexOf(search, startIndex);
    if (exact !== -1)
        return exact;
    const searchLines = search.split("\n").filter((l) => l.trim());
    if (searchLines.length === 0)
        return startIndex;
    const prefix = text.slice(0, startIndex);
    const textLines = text.slice(startIndex).split("\n");
    for (let i = 0; i < textLines.length; i++) {
        let matches = 0;
        for (let j = 0; j < searchLines.length && i + j < textLines.length; j++) {
            const searchLine = searchLines[j].trim();
            const textLine = textLines[i + j].trim();
            if (textLine.includes(searchLine) ||
                searchLine.includes(textLine) ||
                levenshteinSimilarity(textLine, searchLine) > 0.7) {
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
function levenshteinSimilarity(a, b) {
    const matrix = [];
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
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
    }
    const distance = matrix[b.length][a.length];
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1 : 1 - distance / maxLen;
}
class EditFileTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "edit_file";
        this.description = "Edit an existing file by providing a mix of unchanged context and new code. " +
            "Use // ... existing code ... comments to mark sections that stay the same. " +
            "Best for medium-sized changes (one function or section). " +
            "For small changes (1-3 lines), prefer search_replace. For large rewrites, prefer write_file.";
        this.schema = editFileSchema;
    }
    async _call(args) {
        const tsPath = (0, file_manifest_1.ensureTypeScriptExtension)(args.path);
        const extensionChanged = tsPath !== args.path;
        const normalizedPath = (0, file_manifest_1.normalizeFilePath)(tsPath);
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { path: normalizedPath, instructions: args.instructions } },
        });
        if (this.agentContext.fileManifest.isProtected(normalizedPath)) {
            const error = `Cannot edit protected file: ${normalizedPath}. This file is critical to the sandbox environment and cannot be modified.`;
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${error}` },
            });
            throw new Error(error);
        }
        let originalContent = "";
        try {
            originalContent = await this.agentContext.sandboxProvider.readFile(normalizedPath);
            const newContent = applyFileEdit(originalContent, args.content);
            this.updateTodosForPath(normalizedPath, 'in_progress');
            await this.agentContext.sandboxProvider.writeFile(normalizedPath, newContent);
            this.updateTodosForPath(normalizedPath, 'completed');
            if (this.agentContext.supabaseProjectId) {
                try {
                    (0, project_store_1.upsertFile)(this.agentContext.supabaseProjectId, normalizedPath, newContent);
                }
                catch (err) {
                    console.warn(`[edit_file] SQLite persist failed for ${normalizedPath}:`, err);
                }
            }
            this.agentContext.streamWriter.write((0, stream_writer_1.createFileUpdateEvent)(normalizedPath, newContent, "modified"));
            try {
                await this.agentContext.fileManifest.updateFile(normalizedPath, "modified");
            }
            catch (err) {
                console.warn(`[edit_file] Manifest update failed for ${normalizedPath}:`, err);
            }
            const extensionNotice = extensionChanged
                ? ` (note: path was corrected from ${args.path} to ${normalizedPath} because this project uses TypeScript)`
                : "";
            let syntaxResult = "";
            let hasSyntaxError = false;
            if (normalizedPath.endsWith(".ts") || normalizedPath.endsWith(".tsx")) {
                const check = await this.agentContext.sandboxProvider.runCommand(`cd /home/user/app && npx tsc --noEmit --skipLibCheck --project tsconfig.app.json`, undefined, { timeoutMs: 2 * 60 * 1000 });
                if (!check.success) {
                    const err = check.stderr || check.stdout || "";
                    if (err.includes("error TS")) {
                        hasSyntaxError = true;
                        syntaxResult = `\n\nTypeScript check:\n${err}`;
                    }
                }
            }
            if (hasSyntaxError) {
                console.error(`[edit_file] Syntax error detected in ${normalizedPath}. Reverting to original.`);
                await this.agentContext.sandboxProvider.writeFile(normalizedPath, originalContent);
                if (this.agentContext.supabaseProjectId) {
                    try {
                        (0, project_store_1.upsertFile)(this.agentContext.supabaseProjectId, normalizedPath, originalContent);
                    }
                    catch { }
                }
                throw new Error(`Edited ${normalizedPath} but the change introduced syntax errors. The file has been reverted to its original state.\n${syntaxResult}\n\nPlease fix the edit and try again.`);
            }
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Edited ${normalizedPath}${extensionNotice}${syntaxResult}` },
            });
            return `Successfully edited ${normalizedPath}${extensionNotice}${syntaxResult}`;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${message}` },
            });
            throw new Error(`Failed to edit ${normalizedPath}: ${message}`);
        }
    }
}
exports.EditFileTool = EditFileTool;
//# sourceMappingURL=edit_file.js.map