"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeCheckerNode = typeCheckerNode;
async function typeCheckerNode(state, deps) {
    const sandboxId = state.sandboxId;
    await deps.emit({
        type: 'status',
        data: { status: 'executing', message: 'Running TypeScript type checks...' },
    });
    try {
        const result = await deps.e2b.runCommand(sandboxId, 'npx tsc --noEmit', '/home/user/app');
        const passed = result.exitCode === 0;
        const rawOutput = result.output || '';
        const errors = rawOutput
            .split('\n')
            .filter((line) => line.trim().length > 0)
            .slice(0, 30);
        deps.logger.debug(`Type check ${passed ? 'passed' : 'failed'} (${errors.length} lines)`);
        return {
            typeCheckPassed: passed,
            typeCheckErrors: passed ? [] : errors,
            messages: [
                {
                    role: 'assistant',
                    content: passed
                        ? 'TypeScript type check passed'
                        : `TypeScript type check failed with ${errors.length} error lines`,
                },
            ],
        };
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        deps.logger.error(`Type checker node failed: ${message}`);
        return {
            typeCheckPassed: false,
            typeCheckErrors: [`Type checker could not run: ${message}`],
            messages: [{ role: 'assistant', content: `Type checker failed to run: ${message}` }],
        };
    }
}
//# sourceMappingURL=type-checker.node.js.map