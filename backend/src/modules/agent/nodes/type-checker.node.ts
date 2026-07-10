import { AgentState } from '../state';
import { GraphDependencies } from '../graph';

export async function typeCheckerNode(
  state: AgentState,
  deps: GraphDependencies,
): Promise<Partial<AgentState>> {
  const sandboxId = state.sandboxId;

  await deps.emit({
    type: 'status',
    data: { status: 'executing', message: 'Running TypeScript type checks...' },
  });

  try {
    const result = await deps.e2b.runCommand(
      sandboxId,
      'npx tsc --noEmit',
      '/home/user/app',
    );

    const passed = result.exitCode === 0;
    const rawOutput = result.output || '';

    // Limit error output to avoid flooding the state / logs.
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
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    deps.logger.error(`Type checker node failed: ${message}`);

    // If we cannot run the type checker, treat it as a failure so the executor
    // investigates rather than silently proceeding with potentially broken code.
    return {
      typeCheckPassed: false,
      typeCheckErrors: [`Type checker could not run: ${message}`],
      messages: [{ role: 'assistant', content: `Type checker failed to run: ${message}` }],
    };
  }
}
