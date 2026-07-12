"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebCrawlTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const webCrawlSchema = zod_1.z.object({
    url: zod_1.z.string().describe("URL to crawl and extract content from"),
});
const DESCRIPTION = `Crawl a website to extract its content. Use this when the user wants to clone, replicate, or reference an existing website design or content.

When to use:
- The user wants to clone/copy/replicate a website
- The user provides a URL and asks to "make it look like this"
- The user wants to extract content from a specific page`;
function stripHtml(html) {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .trim();
}
class WebCrawlTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "web_crawl";
        this.description = DESCRIPTION;
        this.schema = webCrawlSchema;
    }
    async _call(args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { url: args.url } },
        });
        try {
            const response = await fetch(args.url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; Bot/0.1)",
                },
            });
            if (!response.ok) {
                throw new Error(`Crawl failed: ${response.status}`);
            }
            const html = await response.text();
            const text = stripHtml(html);
            const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : "No title";
            const maxLength = 8000;
            const content = text.length > maxLength ? text.slice(0, maxLength) + "\n...[truncated]" : text;
            const output = `Title: ${title}\nURL: ${args.url}\n\nContent:\n${content}`;
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Crawled ${args.url}` },
            });
            return output;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${message}` },
            });
            return `Crawl error: ${message}`;
        }
    }
}
exports.WebCrawlTool = WebCrawlTool;
//# sourceMappingURL=web_crawl.js.map