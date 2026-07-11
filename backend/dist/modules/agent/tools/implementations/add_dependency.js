"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddDependencyTool = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const addDependencySchema = zod_1.z.object({
    package: zod_1.z.string().describe("The npm package name to install"),
    version: zod_1.z
        .string()
        .optional()
        .describe("Optional version constraint (e.g. '^1.0.0')"),
    dev: zod_1.z
        .boolean()
        .optional()
        .describe("Whether to install as a dev dependency"),
});
class AddDependencyTool extends types_1.AgentTool {
    constructor() {
        super(...arguments);
        this.name = "add_dependency";
        this.description = "Add an npm package dependency to the project. Records the package in package.json; dependencies are installed in bulk during finalization.";
        this.schema = addDependencySchema;
    }
    async _call(args) {
        this.agentContext.streamWriter.write({
            type: "tool_start",
            data: { tool: this.name, args: { package: args.package } },
        });
        const section = args.dev ? "devDependencies" : "dependencies";
        const versionSpec = args.version || "*";
        const pkgDisplay = args.version
            ? `${args.package}@${args.version}`
            : args.package;
        try {
            this.agentContext.streamWriter.write({
                type: "tool_progress",
                data: { tool: this.name, message: `Recording ${pkgDisplay}...` },
            });
            const raw = await this.agentContext.sandboxProvider.readFile("package.json");
            const pkgJson = JSON.parse(raw);
            const existing = pkgJson[section] ?? {};
            pkgJson[section] = { ...existing, [args.package]: versionSpec };
            await this.agentContext.sandboxProvider.writeFile("package.json", JSON.stringify(pkgJson, null, 2) + "\n");
            this.agentContext.streamWriter.write({
                type: "tool_progress",
                data: { tool: this.name, message: `Recorded ${pkgDisplay}`, percent: 100 },
            });
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Recorded ${pkgDisplay}` },
            });
            return `Successfully recorded ${pkgDisplay} for installation`;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.agentContext.streamWriter.write({
                type: "tool_progress",
                data: { tool: this.name, message: `Failed to record ${pkgDisplay}: ${message}` },
            });
            this.agentContext.streamWriter.write({
                type: "tool_end",
                data: { tool: this.name, result: `Error: ${message}` },
            });
            throw new Error(`Failed to add dependency: ${message}`);
        }
    }
}
exports.AddDependencyTool = AddDependencyTool;
//# sourceMappingURL=add_dependency.js.map