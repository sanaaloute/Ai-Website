import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
import { SandboxProvider } from '../tools';

export async function finalizeNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>> {
  const tools = new SandboxProvider(deps.e2b, state.sandboxId, state.projectId);

  try {
    const currentSandboxId = await tools.ensureAlive(state.userId);

    // Only run npm install when something actually changed. New apps need the
    // template dependencies; edits that recorded new packages also need it.
    const hasPendingPackages =
      (state.packagesInstalled?.length ?? 0) > 0 ||
      (state.packagesToInstall?.length ?? 0) > 0;
    const shouldInstall = state.workflow === 'new_app' || hasPendingPackages;

    if (shouldInstall) {
      await deps.emit({ type: 'status', data: { status: 'installing', message: 'Installing dependencies...' } });
      await deps.emit({ type: 'tool_progress', data: { tool: 'npm_install', message: 'Installing dependencies...' } });

      const installResult = await tools.runCommand('npm install', '/home/user/app', {
        timeoutMs: 5 * 60 * 1000,
        onStdout: (data) => deps.logger.debug(`[npm install] ${data.slice(0, 200)}`),
        onStderr: (data) => deps.logger.debug(`[npm install stderr] ${data.slice(0, 200)}`),
      });

      if (!installResult.success) {
        const errorMessage = `npm install failed: ${installResult.stderr || installResult.stdout}`;
        deps.logger.error(errorMessage);
        return {
          previewUrl: '',
          summary: `Completed with errors: ${errorMessage}`,
          error: errorMessage,
          messages: [{ role: 'assistant', content: `Dependency install failed: ${errorMessage}` }],
        };
      }

      // Update the cached package.json hash so future restartPreview calls skip
      // the install step when dependencies haven't changed.
      await tools.recordPackageJsonHash();
    }

    // Always make sure the preview server is running before returning. The
    // verification stage already started it and set previewHealthy; if we reach
    // finalize without that flag (e.g. error path), do a lightweight health check
    // and restart only when necessary.
    if (!state.previewHealthy) {
      await deps.emit({ type: 'status', data: { status: 'finalizing', message: 'Starting preview server...' } });
      await tools.ensurePreviewRunning();
    }

    const previewUrl = await tools.getSandboxUrl();

    const filesWritten = state.filesWritten ?? [];
    const issues = state.reviewIssues ?? [];
    const retry = state.retryCount ?? 0;
    const passed = state.reviewPassed ?? true;

    let summary: string;
    if (!passed && retry >= 3) {
      summary =
        '⚠️ I\'ve attempted to implement your request three times, but the code still fails review.\n\n' +
        'Remaining issues:\n' +
        issues.map((issue) => `- ${issue}`).join('\n') +
        '\n\nPlease provide more specific guidance, or I can try a different approach.';
    } else {
      summary = state.planSummary || 'Changes applied successfully';
      if (filesWritten.length) summary += ` (${filesWritten.length} files updated)`;
      if (issues.length) summary += `. ${issues.length} review notes available.`;
    }

    const todos = (state.todos ?? []).map((todo) => ({ ...todo, status: 'completed' }));

    return {
      sandboxId: currentSandboxId,
      previewUrl,
      summary,
      todos,
      messages: [{ role: 'assistant', content: summary }],
    };
  } catch (e) {
    deps.logger.error(`Finalize node failed: ${e instanceof Error ? e.message : String(e)}`);
    return {
      previewUrl: '',
      summary: `Completed with errors: ${e instanceof Error ? e.message : String(e)}`,
      error: e instanceof Error ? e.message : String(e),
      messages: [{ role: 'assistant', content: `Finalization error: ${e instanceof Error ? e.message : String(e)}` }],
    };
  }
}
