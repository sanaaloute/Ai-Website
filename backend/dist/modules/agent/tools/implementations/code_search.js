"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeSearchTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const codeSearchSchema = zod_1.z.object({
    query: zod_1.z.string().describe("What you're looking for (e.g. 'auth hook', 'toast component')"),
    file_pattern: zod_1.z
        .string()
        .optional()
        .describe("Optional file pattern to limit search (e.g. '*.ts', '*.tsx')"),
});
class CodeSearchTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "code_search";
        this.description = `Search the codebase for code patterns, functions, components, or concepts. This is a semantic-aware search that looks for related code, not just exact text matches.

Use this when:
- You need to find how something is implemented
- Looking for examples of patterns (hooks, components, utilities)
- Searching for function definitions or imports
- Finding related files to a feature`;
        this.schema = codeSearchSchema;
    }
    async _call(args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { query: args.query } },
        });
        try {
            const keywords = args.query
                .toLowerCase()
                .replace(/[^a-z0-9_\s]/g, " ")
                .split(/\s+/)
                .filter((w) => w.length > 2);
            const results = [];
            for (const keyword of keywords.slice(0, 3)) {
                const cmd = args.file_pattern
                    ? `grep -r -n -i -e "${keyword}" --include="${args.file_pattern}" .`
                    : `grep -r -n -i -e "${keyword}" .`;
                const grepResult = await this.agentContext.sandboxProvider.runCommand(cmd);
                if (grepResult.stdout) {
                    const lines = grepResult.stdout.split("\n").filter((l) => l.trim());
                    for (const line of lines.slice(0, 20)) {
                        const match = line.match(/^(.+?):(\d+):(.*)$/);
                        if (match) {
                            const path = match[1].replace(/^\.\//, "");
                            const lineNumber = parseInt(match[2], 10);
                            const lineText = match[3].trim();
                            if (path.includes("node_modules") ||
                                path.includes("/.git/") ||
                                path.includes("/dist/") ||
                                path.includes("/build/") ||
                                path.includes("/.next/")) {
                                continue;
                            }
                            let score = 1;
                            if (lineText.toLowerCase().includes("export"))
                                score += 2;
                            if (lineText.toLowerCase().includes("function"))
                                score += 1;
                            if (lineText.toLowerCase().includes("const " + keyword.toLowerCase()))
                                score += 3;
                            if (lineText.toLowerCase().includes("class"))
                                score += 1;
                            results.push({ path, lineNumber, lineText, score });
                        }
                    }
                }
            }
            results.sort((a, b) => b.score - a.score);
            const seen = new Set();
            const unique = results.filter((r) => {
                const key = `${r.path}:${r.lineNumber}`;
                if (seen.has(key))
                    return false;
                seen.add(key);
                return true;
            });
            const top = unique.slice(0, 30);
            if (top.length === 0) {
                return `No code found matching "${args.query}". Try different keywords or use grep for exact text search.`;
            }
            const formatted = top
                .map((r) => `${r.path}:${r.lineNumber}: ${r.lineText}`)
                .join("\n");
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: {
                    tool: this.name,
                    result: `Found ${top.length} matches`,
                },
            });
            return `Search results for "${args.query}":\n\n${formatted}`;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${message}` },
            });
            return `Search error: ${message}`;
        }
    }
}
exports.CodeSearchTool = CodeSearchTool;
//# sourceMappingURL=code_search.js.map