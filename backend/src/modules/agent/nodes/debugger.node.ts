import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
import { buildDebugToolSet, runToolLoop, ToolLoopMessage } from '../tools';
import { promptToString, buildPromptContent } from '@/types';

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

export async function debuggerNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>> {
  const userApiKey = state.userApiKey;

  const systemPrompt = await deps.promptLoader.load('debugger');
  const debugErrors = state.debugRemainingErrors?.length ? state.debugRemainingErrors : [];
  const reviewIssues = state.reviewIssues?.length ? state.reviewIssues : [];
  const errors = debugErrors.length ? debugErrors : reviewIssues;
  const context = `Build logs:\n${errors.join('\n') || ''}\n\nReview issues:\n${reviewIssues.join('\n') || '(none)'}\n\nDatabase status: ${JSON.stringify(state.databaseStatus ?? { checked: false })}\n\nUser request: ${promptToString(state.prompt)}`;

  const messages: ToolLoopMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: promptToString(buildPromptContent(context, state.prompt)) },
  ];

  let result: Record<string, unknown> = {};
  let resultText = '';
  let loopResult: import('../tools').ToolLoopResult | undefined;

  try {
    loopResult = await runToolLoop(
      deps,
      state,
      (ctx, docs) => buildDebugToolSet(ctx, docs),
      messages,
      'debugger',
      userApiKey,
      5,
    );
    resultText = loopResult!.finalContent;

    result = extractJson(resultText) || {};
    if (!Object.keys(result).length) {
      result = {
        fixed: /fixed|resolved/i.test(resultText),
        affected_files: [],
        fixes_applied: [resultText],
        remaining_errors: [],
      };
    }
  } catch (e) {
    deps.logger.error(`Debugger node failed: ${e instanceof Error ? e.message : String(e)}`);
    return {
      debugFixed: false,
      bugAffectedFiles: [],
      bugRootCause: e instanceof Error ? e.message : String(e),
      debugRemainingErrors: [e instanceof Error ? e.message : String(e)],
      error: e instanceof Error ? e.message : String(e),
      messages: [{ role: 'assistant', content: `Debug error: ${e instanceof Error ? e.message : String(e)}` }],
    };
  }

  const fixed = !!result.fixed;
  const affectedFiles = Array.isArray(result.affected_files) ? (result.affected_files as string[]) : [];
  const remainingErrors = Array.isArray(result.remaining_errors) ? (result.remaining_errors as string[]) : [];

  let bugErrorType = 'runtime';
  const errorText = (state.debugRemainingErrors ?? []).join('\n');
  if (/SyntaxError|Unexpected token/.test(errorText)) bugErrorType = 'syntax';
  else if (/Cannot find module|Cannot resolve/.test(errorText)) bugErrorType = 'missing_import';
  else if (/TypeError|is not a function/.test(errorText)) bugErrorType = 'type_error';
  else if (/ENOENT|no such file/i.test(errorText)) bugErrorType = 'wrong_path';
  else if (/Module not found/.test(errorText)) bugErrorType = 'missing_package';

  const reachedFromReviewer = state.lastVerificationStage === 'reviewer';

  return {
    debugFixed: fixed,
    bugErrorType,
    bugAffectedFiles: affectedFiles,
    bugRootCause: (result.root_cause as string) || '',
    debugRemainingErrors: remainingErrors,
    todos: loopResult?.todos,
    filesWritten: loopResult?.filesChanged.map((f) => ({ path: f.path, status: f.status })) ?? affectedFiles.map((f) => ({ path: f, status: 'modified' })),
    ...(reachedFromReviewer
      ? {
          retryCount: (state.retryCount ?? 0) + 1,
          lastVerificationStage: 'reviewer',
        }
      : {}),
    messages: [{
      role: 'assistant',
      content: `Debug: ${fixed ? 'fixed' : 'needs escalation'} — ${remainingErrors.length} remaining errors`,
    }],
  };
}
