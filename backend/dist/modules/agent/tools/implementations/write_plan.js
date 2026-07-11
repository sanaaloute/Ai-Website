"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WritePlanTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const writePlanSchema = zod_1.z.object({
    title: zod_1.z.string().describe("Title of the implementation plan"),
    summary: zod_1.z
        .string()
        .describe("Brief summary (1-2 sentences) of what will be built"),
    plan: zod_1.z
        .string()
        .describe("Full implementation plan in markdown format. Include sections for: feature overview, UI/UX design, considerations, technical approach, implementation steps, code changes, and testing strategy. Put product/UX sections first, technical sections last."),
});
class WritePlanTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "write_plan";
        this.description = `Present an implementation plan to the user.

The plan should be comprehensive and include (in this order — product/UX first, technical last):
- **Overview**: Clear description of what will be built or changed
- **UI/UX Design**: User flows, layout, component placement, interactions
- **Considerations**: Potential challenges, trade-offs, edge cases, or alternatives
- **Technical Approach**: Architecture decisions, patterns to use, libraries needed
- **Implementation Steps**: Ordered, granular tasks with file-level specificity
- **Code Changes**: Specific files to modify/create and what changes are needed
- **Testing Strategy**: How the feature should be validated

Format the plan in markdown for clear readability. Use headers, bullet points, and code blocks for file paths.`;
        this.schema = writePlanSchema;
    }
    async _call(args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { title: args.title } },
        });
        this.agentContext.streamWriter.write({
            type: "plan",
            data: {
                title: args.title,
                summary: args.summary,
                plan: args.plan,
            },
        });
        this.agentContext.streamWriter.write({
            type: "tool_end",
            data: {
                tool: this.name,
                result: `Plan "${args.title}" presented to user`,
            },
        });
        return `Implementation plan "${args.title}" has been presented to the user. They can review it and either accept it or request changes in their next message.`;
    }
}
exports.WritePlanTool = WritePlanTool;
//# sourceMappingURL=write_plan.js.map