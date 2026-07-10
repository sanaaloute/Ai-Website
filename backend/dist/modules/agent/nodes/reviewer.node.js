"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewerNode = reviewerNode;
const tools_1 = require("../tools");
const tools_2 = require("../tools");
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
async function reviewerNode(state, deps) {
    const tools = new tools_1.SandboxProvider(deps.e2b, state.sandboxId, state.projectId);
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
        const { finalContent } = await (0, tools_2.runToolLoop)(deps, state, (ctx, docs) => (0, tools_2.buildReadOnlyToolSet)(ctx, docs), messages, 'reviewer', userApiKey, 15);
        const result = extractJson(finalContent) || {};
        const passed = !!result.passed;
        const issues = Array.isArray(result.issues) ? result.issues : [];
        const suggestions = Array.isArray(result.suggestions) ? result.suggestions : [];
        const reviewTodos = Array.isArray(result.todos)
            ? result.todos
                .map((t, i) => ({
                id: typeof t.id === 'string' ? t.id : typeof t.id === 'number' ? String(t.id) : `fix-${i + 1}`,
                content: typeof t.content === 'string' ? t.content : String(t),
                status: ['pending', 'in_progress', 'completed'].includes(t.status)
                    ? t.status
                    : 'pending',
            }))
            : issues.map((issue, i) => ({
                id: `fix-${i + 1}`,
                content: issue,
                status: 'pending',
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
    }
    catch (e) {
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
//# sourceMappingURL=reviewer.node.js.map