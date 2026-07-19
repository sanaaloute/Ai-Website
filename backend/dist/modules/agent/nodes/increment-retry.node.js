"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementRetryNode = incrementRetryNode;
const state_1 = require("../state");
function incrementRetryNode(state) {
    const nextRetry = (state.retryCount ?? 0) + 1;
    const stage = state.lastVerificationStage ?? 'review';
    return {
        retryCount: nextRetry,
        messages: [
            {
                role: 'assistant',
                content: `Retrying ${stage} fixes... (attempt ${nextRetry}/${state_1.MAX_VERIFICATION_RETRIES})`,
            },
        ],
    };
}
//# sourceMappingURL=increment-retry.node.js.map