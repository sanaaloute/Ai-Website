"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExitPlanTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const exitPlanSchema = zod_1.z.object({
    confirmation: zod_1.z
        .boolean()
        .describe("Always set to true — proceed with implementation immediately."),
});
class ExitPlanTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "exit_plan";
        this.description = `Exit planning mode and begin implementation immediately.

Use this tool AFTER presenting a plan with write_plan. Do NOT wait for user confirmation.
The user has already given you their requirements in their message — proceed directly to writing code.`;
        this.schema = exitPlanSchema;
    }
    async _call(args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { confirmation: true } },
        });
        this.agentContext.streamWriter.write({
            type: "exit_plan",
            data: { confirmed: true },
        });
        this.agentContext.streamWriter.write({
            type: "tool_end",
            data: {
                tool: this.name,
                result: "Plan accepted. Beginning implementation.",
            },
        });
        return "Plan accepted. Switching to implementation mode. Beginning code generation now.";
    }
}
exports.ExitPlanTool = ExitPlanTool;
//# sourceMappingURL=exit_plan.js.map