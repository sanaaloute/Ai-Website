import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
import { SandboxProvider } from '../tools';
import { buildReadOnlyToolSet, runToolLoop } from '../tools';

function extractJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function reviewerNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>> {
  const tools = new SandboxProvider(deps.e2b, state.sandboxId, state.projectId);
  const userApiKey = state.userApiKey;

  const filesWritten = state.filesWritten ?? [];
  if (!filesWritten.length) {
    return {
      reviewPassed: true,
      reviewIssues: [],
      reviewSuggestions: [],
      reviewTodos: [],
      messages: [{ role: 'assistant', content: 'No files to review' }],
    };
  }

  const systemPrompt = await deps.promptLoader.load('reviewer');

  const context = JSON.stringify({
    userRequest: state.prompt,
    analyzer: {
      intent: state.intent,
      scope: state.scope,
      relevantFiles: state.relevantFiles ?? [],
      websiteCategory: state.websiteCategory,
      websiteType: state.websiteType,
      needsIntegration: state.needsIntegration,
    },
    planner: {
      summary: state.planSummary,
      steps: state.planSteps ?? [],
    },
    dbSchemaTemplate: state.dbSchemaTemplate ?? {},
    databaseStatus: state.databaseStatus ?? { checked: false },
    filesChanged: filesWritten.map((fw) => ({ path: fw.path, status: fw.status })),
    previousReviewIssues: state.reviewIssues ?? [],
  });

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: context },
  ];

  try {
    await deps.emit({
      type: 'status',
      data: { status: 'reviewing', message: 'Reviewing the full project for issues...' },
    });

    const { finalContent } = await runToolLoop(
      deps,
      state,
      (ctx, docs) => buildReadOnlyToolSet(ctx, docs),
      messages,
      'reviewer',
      userApiKey,
      15,
    );

    const result = extractJson(finalContent) || {};
    const passed = !!result.passed;

    const issues = Array.isArray(result.issues) ? (result.issues as string[]) : [];
    const suggestions = Array.isArray(result.suggestions) ? (result.suggestions as string[]) : [];

    // The reviewer produces a fresh todo list that replaces the executor's old
    // todo list on retry. Each todo is a concrete fix task derived from the issues.
    const reviewTodos = Array.isArray(result.todos)
      ? (result.todos as Array<{ id?: string | number; content?: string; status?: string }>)
          .map((t, i) => ({
            id: typeof t.id === 'string' ? t.id : typeof t.id === 'number' ? String(t.id) : `fix-${i + 1}`,
            content: typeof t.content === 'string' ? t.content : String(t),
            status: ['pending', 'in_progress', 'completed'].includes(t.status as string)
              ? (t.status as 'pending' | 'in_progress' | 'completed')
              : ('pending' as const),
          }))
      : issues.map((issue, i) => ({
          id: `fix-${i + 1}`,
          content: issue,
          status: 'pending' as const,
        }));

    return {
      reviewPassed: passed,
      reviewIssues: issues,
      reviewSuggestions: suggestions,
      reviewTodos,
      todos: passed ? state.todos : reviewTodos,
      lastVerificationStage: passed ? undefined : 'reviewer',
      verificationFailures: passed
        ? state.verificationFailures
        : [...(state.verificationFailures ?? []), ...issues.map((i) => `reviewer: ${i}`)].slice(-20),
      messages: [{ role: 'assistant', content: `Review: ${passed ? 'passed' : 'failed'} (${issues.length} issues)` }],
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    deps.logger.error(`Reviewer node failed: ${message}`);
    const issue = `Review system error: ${message}`;
    return {
      reviewPassed: false,
      reviewIssues: [issue],
      reviewSuggestions: ['Please retry or contact support if the issue persists.'],
      reviewTodos: [],
      lastVerificationStage: 'reviewer',
      verificationFailures: [...(state.verificationFailures ?? []), `reviewer: ${issue}`].slice(-20),
      messages: [{ role: 'assistant', content: `Review error: ${message}` }],
    };
  }
}
