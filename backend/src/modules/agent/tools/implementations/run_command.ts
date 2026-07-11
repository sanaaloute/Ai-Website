import { z } from "zod";
import { AgentTool } from "../types";

const runCommandSchema = z.object({
  command: z.string().describe("The shell command to run in the project workspace (/home/user/app)"),
});

export class RunCommandTool extends AgentTool {
  name = "run_command";
  description =
    "Run an arbitrary shell command in the project workspace. " +
    "Use this for one-off operations that don't have a dedicated tool. " +
    "Prefer specialized tools (read_file, write_file, add_dependency, run_type_checks) when available.";
  schema = runCommandSchema;

  async _call(args: z.infer<typeof runCommandSchema>): Promise<string> {
    this.agentContext.streamWriter.write({
      type: "tool_start",
      data: { tool: this.name, args: { command: args.command } },
    });

    try {
      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];

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

      const output =
        `exitCode: ${result.exitCode}\n` +
        `stdout:\n${result.stdout}\n` +
        `stderr:\n${result.stderr}`;

      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Command exited ${result.exitCode}` },
      });

      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.agentContext.streamWriter.write({
        type: "tool_end",
        data: { tool: this.name, result: `Error: ${message}` },
      });
      return `Error running command: ${message}`;
    }
  }
}
