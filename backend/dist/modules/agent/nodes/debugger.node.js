"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debuggerNode = debuggerNode;
const state_1 = require("../state");
const tools_1 = require("../tools");
const types_1 = require("../../../types");
function extractJson(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            }
            catch {
                return null;
            }
        }
        return null;
    }
}
async function debuggerNode(state, deps) {
    const aiCredentials = state.aiCredentials;
    const systemPrompt = await deps.promptLoader.load('debugger');
    const debugErrors = state.debugRemainingErrors?.length ? state.debugRemainingErrors : [];
    const reviewIssues = state.reviewIssues?.length ? state.reviewIssues : [];
    const reachedFromReviewer = state.lastVerificationStage === 'reviewer';
    const reviewRetry = state.reviewRetryCount ?? 0;
    const sections = [];
    if (reachedFromReviewer) {
        sections.push(`WHY YOU WERE CALLED: the reviewer rejected the previous attempt (this is fix retry #${reviewRetry + 1} of ${state_1.MAX_REVIEW_RETRIES}). ` +
            `Fix ONLY the review issues below — do not redesign, refactor, or touch unrelated code.`, `Review issues:\n${reviewIssues.join('\n') || '(none)'}`);
    }
    else {
        sections.push(`WHY YOU WERE CALLED: the user reported a bug. Investigate and fix it with the SMALLEST possible change.`, `Analyzer intent: ${state.intent ?? '(unknown)'}`, `Analyzer scope: ${state.scope ?? '(none)'}`, `Relevant files (from analyzer): ${(state.relevantFiles ?? []).join(', ') || '(none identified)'}`);
    }
    if (debugErrors.length) {
        sections.push(`Remaining errors from your previous fix attempt:\n${debugErrors.join('\n')}`);
    }
    if (state.typeCheckErrors?.length) {
        sections.push(`Current TypeScript errors:\n${state.typeCheckErrors.join('\n')}`);
    }
    sections.push(`Database status: ${JSON.stringify(state.databaseStatus ?? { checked: false })}`, `User request: ${(0, types_1.promptToString)(state.prompt)}`);
    const context = sections.join('\n\n');
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: (0, types_1.promptToString)((0, types_1.buildPromptContent)(context, state.prompt)) },
    ];
    let result = {};
    let resultText = '';
    let loopResult;
    try {
        loopResult = await (0, tools_1.runToolLoop)(deps, state, (ctx, docs) => (0, tools_1.buildDebugToolSet)(ctx, docs), messages, 'debugger', aiCredentials, 8);
        resultText = loopResult.finalContent;
        result = extractJson(resultText) || {};
        if (!Object.keys(result).length) {
            const claimsFixed = /\b(fixed|resolved)\b/i.test(resultText) &&
                !/\b(not fixed|couldn'?t fix|could not fix|unable to fix|not resolved|unresolved)\b/i.test(resultText);
            result = {
                fixed: claimsFixed,
                affected_files: [],
                fixes_applied: [resultText],
                remaining_errors: [],
            };
        }
    }
    catch (e) {
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
    const affectedFiles = Array.isArray(result.affected_files) ? result.affected_files : [];
    const remainingErrors = Array.isArray(result.remaining_errors) ? result.remaining_errors : [];
    let bugErrorType = 'runtime';
    const errorText = (state.debugRemainingErrors ?? []).join('\n');
    if (/SyntaxError|Unexpected token/.test(errorText))
        bugErrorType = 'syntax';
    else if (/Cannot find module|Cannot resolve/.test(errorText))
        bugErrorType = 'missing_import';
    else if (/TypeError|is not a function/.test(errorText))
        bugErrorType = 'type_error';
    else if (/ENOENT|no such file/i.test(errorText))
        bugErrorType = 'wrong_path';
    else if (/Module not found/.test(errorText))
        bugErrorType = 'missing_package';
    return {
        debugFixed: fixed,
        bugErrorType,
        bugAffectedFiles: affectedFiles,
        bugRootCause: result.root_cause || '',
        debugRemainingErrors: remainingErrors,
        todos: loopResult?.todos,
        filesWritten: loopResult?.filesChanged.map((f) => ({ path: f.path, status: f.status })) ?? affectedFiles.map((f) => ({ path: f, status: 'modified' })),
        ...(reachedFromReviewer
            ? {
                reviewRetryCount: (state.reviewRetryCount ?? 0) + 1,
                lastVerificationStage: 'reviewer',
            }
            : {}),
        messages: [{
                role: 'assistant',
                content: `Debug: ${fixed ? 'fixed' : 'needs escalation'} — ${remainingErrors.length} remaining errors`,
            }],
    };
}
//# sourceMappingURL=debugger.node.js.map