"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementRetryNode = incrementRetryNode;
function incrementRetryNode(state) {
    const nextRetry = (state.retryCount ?? 0) + 1;
    const stage = state.lastVerificationStage ?? 'review';
    return {
        retryCount: nextRetry,
        messages: [
            {
                role: 'assistant',
                content: `Retrying ${stage} fixes... (attempt ${nextRetry}/3)`,
            },
        ],
    };
}
//# sourceMappingURL=increment-retry.node.js.map