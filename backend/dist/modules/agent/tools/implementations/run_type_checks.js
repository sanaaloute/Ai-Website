"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunTypeChecksTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const runTypeChecksSchema = zod_1.z.object({});
class RunTypeChecksTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "run_type_checks";
        this.description = "Run TypeScript type checks (tsc --noEmit) across the entire project to verify code correctness. Always checks the whole project (per-file checks are not supported); use after making changes to catch type errors.";
        this.schema = runTypeChecksSchema;
    }
    async _call(_args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: {} },
        });
        try {
            const cmd = "npx tsc --noEmit --skipLibCheck --project tsconfig.app.json";
            const result = await this.agentContext.sandboxProvider.runCommand(cmd, '/home/user/app');
            const output = result.stdout || result.stderr || "";
            const summary = result.success
                ? "Type check passed with no errors."
                : `Type check failed with exit code ${result.exitCode}.`;
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: summary },
            });
            return `${summary}\n\n${output}`;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${message}` },
            });
            return `Type check error: ${message}`;
        }
    }
}
exports.RunTypeChecksTool = RunTypeChecksTool;
//# sourceMappingURL=run_type_checks.js.map