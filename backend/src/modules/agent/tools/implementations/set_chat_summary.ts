import { z } from "zod";
import { AgentTool } from "../types";

const setChatSummarySchema = z.object({
  summary: z.string().describe("A short summary/title for the chat"),
});

export class SetChatSummaryTool extends AgentTool {
  name = "set_chat_summary";
  description =
    "Set the title/summary for this chat conversation. Call this at the end of your turn after finishing all other work.";
  schema = setChatSummarySchema;

  async _call(args: z.infer<typeof setChatSummarySchema>): Promise<string> {
    return `Chat summary set to: ${args.summary}`;
  }
}
