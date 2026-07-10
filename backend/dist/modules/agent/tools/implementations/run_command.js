"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunCommandTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const runCommandSchema = zod_1.z.object({
    command: zod_1.z.string().describe("The shell command to run in the project workspace (/home/user/app)"),
});
class RunCommandTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "run_command";
        this.description = "Run an arbitrary shell command in the project workspace. " +
            "Use this for one-off operations that don't have a dedicated tool. " +
            "Prefer specialized tools (read_file, write_file, add_dependency, run_type_checks) when available.";
        this.schema = runCommandSchema;
    }
    async _call(args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { command: args.command } },
        });
        try {
            const stdoutChunks = [];
            const stderrChunks = [];
            const result = await this.agentContext.sandboxProvider.runCommand(args.command, undefined, {
                timeoutMs: 5 * 60 * 1000,
                onStdout: (data) => {
                    stdoutChunks.push(data);
                    this.agentContext.streamWriter.write({
                        type: "command_delta",
                        data: { tool: this.name, stream: "stdout", chunk: data },
                    });
                },
                onStderr: (data) => {
                    stderrChunks.push(data);
                    this.agentContext.streamWriter.write({
                        type: "command_delta",
                        data: { tool: this.name, stream: "stderr", chunk: data },
                    });
                },
            });
            const output = `exitCode: ${result.exitCode}\n` +
                `stdout:\n${result.stdout}\n` +
                `stderr:\n${result.stderr}`;
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Command exited ${result.exitCode}` },
            });
            return output;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${message}` },
            });
            return `Error running command: ${message}`;
        }
    }
}
exports.RunCommandTool = RunCommandTool;
//# sourceMappingURL=run_command.js.map