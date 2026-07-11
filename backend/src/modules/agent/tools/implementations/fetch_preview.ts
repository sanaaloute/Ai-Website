import { z } from "zod";
import { AgentTool } from "../types";

const fetchPreviewSchema = z.object({
  path: z
    .string()
    .optional()
    .describe("Optional path to fetch (e.g., '/about'). Defaults to root '/'"),
});

/**
 * Fetch the HTML content of the sandbox preview.
 * Useful for the agent to see what the app looks like and debug rendering issues.
 */
export class FetchPreviewTool extends AgentTool {
  name = "fetch_preview";
  description =
    "Fetch the rendered HTML of the app preview. Use this to verify that the UI looks correct, " +
    "check for rendering errors, or see the result of your changes. " +
    "Returns the page title, status, and a text preview of the HTML content.";
  schema = fetchPreviewSchema;

  async _call(args: z.infer<typeof fetchPreviewSchema>): Promise<string> {
    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args },
    });

    try {
      const previewUrl = await this.agentContext.sandboxProvider.getSandboxUrl();
      if (!previewUrl) {
        throw new Error("No preview URL available. The sandbox may not be running yet.");
      }

      const targetPath = args.path || "/";
      const targetUrl = targetPath === "/" ? previewUrl : `${previewUrl.replace(/\/$/, "")}${targetPath}`;

      // Fetch the preview HTML via HTTP
      const response = await fetch(targetUrl, {
        headers: { Accept: "text/html" },
      });

      const status = response.status;
      const statusText = response.statusText;
      const html = await response.text();

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "(no title)";

      // Extract body text (strip tags for a readable preview)
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      let bodyPreview = "";
      if (bodyMatch) {
        bodyPreview = bodyMatch[1]
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 2000);
      }

      // Check for common error indicators
      const hasError =
        status >= 400 ||
        html.includes("Application error") ||
        html.includes("Internal Server Error") ||
        html.includes("Build Error") ||
        html.includes("Unhandled Runtime Error");

      const result = `Preview fetch result for ${targetPath}:\n` +
        `- URL: ${targetUrl}\n` +
        `- Status: ${status} ${statusText}\n` +
        `- Title: ${title}\n` +
        `- Has Error: ${hasError ? "YES" : "No"}\n\n` +
        `HTML Body Preview:\n${bodyPreview || "(empty body)"}`;

      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Fetched preview (${status} ${statusText})` },
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      throw new Error(`Failed to fetch preview: ${message}`);
    }
  }
}
