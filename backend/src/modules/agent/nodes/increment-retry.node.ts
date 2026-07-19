import { AgentState, MAX_VERIFICATION_RETRIES } from '../state';

export function incrementRetryNode(state: AgentState): Partial<AgentState> {
  const nextRetry = (state.retryCount ?? 0) + 1;
  const stage = state.lastVerificationStage ?? 'review';
  return {
    retryCount: nextRetry,
    messages: [
      {
        role: 'assistant',
        content: `Retrying ${stage} fixes... (attempt ${nextRetry}/${MAX_VERIFICATION_RETRIES})`,
      },
    ],
  };
}
