"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coordinatorNode = coordinatorNode;
async function coordinatorNode(state) {
    const workflow = state.workflow;
    const retry = state.retryCount ?? 0;
    const needsClarification = state.needsClarification ?? false;
    let message;
    if (needsClarification) {
        const questions = state.clarificationQuestions ?? [];
        message = 'I need a bit more clarity: ' + questions.join(' ');
    }
    else if (!workflow) {
        message = 'Analyzing your request...';
    }
    else if (workflow === 'chat') {
        message = 'Let me look that up for you...';
    }
    else if (workflow === 'debug') {
        message = `Investigating the issue... (attempt ${retry + 1})`;
    }
    else if (workflow === 'new_app') {
        message = `Designing your ${state.websiteCategory || 'website'}...`;
    }
    else if (workflow === 'edit') {
        message = `Planning edits... (attempt ${retry + 1})`;
    }
    else if (workflow === 'review_fix') {
        message = `Continuing to fix review issues... (attempt ${retry + 1})`;
    }
    else {
        message = 'Processing your request...';
    }
    return {
        messages: [{ role: 'assistant', content: message }],
    };
}
//# sourceMappingURL=coordinator.node.js.map