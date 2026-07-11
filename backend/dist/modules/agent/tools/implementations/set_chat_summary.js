"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetChatSummaryTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const setChatSummarySchema = zod_1.z.object({
    summary: zod_1.z.string().describe("A short summary/title for the chat"),
});
class SetChatSummaryTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "set_chat_summary";
        this.description = "Set the title/summary for this chat conversation. Call this at the end of your turn after finishing all other work.";
        this.schema = setChatSummarySchema;
    }
    async _call(args) {
        return `Chat summary set to: ${args.summary}`;
    }
}
exports.SetChatSummaryTool = SetChatSummaryTool;
//# sourceMappingURL=set_chat_summary.js.map