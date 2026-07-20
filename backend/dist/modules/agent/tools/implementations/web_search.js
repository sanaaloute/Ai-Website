"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSearchTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const webSearchSchema = zod_1.z.object({
    query: zod_1.z.string().describe("The search query to look up on the web"),
});
const DESCRIPTION = `Search the web for real-time information beyond your training data cutoff.

When to Search:
- Current API documentation, library versions, or breaking changes
- Latest best practices, security advisories, or bug fixes
- Specific error messages or troubleshooting solutions
- Recent framework updates or deprecation notices

Query Tips:
- Be specific: Include version numbers, exact error messages, or technical terms
- Add context: "React 19 useEffect cleanup" not just "React hooks"`;
class WebSearchTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "web_search";
        this.description = DESCRIPTION;
        this.schema = webSearchSchema;
    }
    async _call(args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { query: args.query } },
        });
        try {
            const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`;
            const response = await fetch(searchUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; Bot/0.1)",
                },
            });
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }
            const html = await response.text();
            const results = [];
            const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g;
            const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/g;
            let match;
            const titles = [];
            const urls = [];
            while ((match = resultRegex.exec(html)) !== null) {
                urls.push(match[1].replace(/^\/l\/\?kh=-?\d+&uddg=/, "").replace(/%25/g, "%"));
                titles.push(match[2].replace(/<[^>]*>/g, ""));
            }
            const snippets = [];
            while ((match = snippetRegex.exec(html)) !== null) {
                snippets.push(match[1].replace(/<[^>]*>/g, ""));
            }
            for (let i = 0; i < Math.min(titles.length, 5); i++) {
                let url = urls[i];
                try {
                    url = decodeURIComponent(url);
                }
                catch {
                }
                results.push(`${i + 1}. ${titles[i]}\n   ${url}\n   ${snippets[i] || ""}`);
            }
            const output = results.join("\n\n") || "No search results found.";
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Found ${results.length} results` },
            });
            return output;
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
exports.WebSearchTool = WebSearchTool;
//# sourceMappingURL=web_search.js.map