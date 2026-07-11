import { incrementRetryNode } from './increment-retry.node';
import { AgentState } from '../state';

describe('incrementRetryNode', () => {
  it('increments retry count and names the stage', () => {
    const state = {
      retryCount: 2,
      lastVerificationStage: 'visual_qa',
    } as unknown as AgentState;

    const result = incrementRetryNode(state);

    expect(result.retryCount).toBe(3);
    expect(result.messages?.[0]?.content).toContain('visual_qa');
    expect(result.messages?.[0]?.content).toContain('3/3');
  });

  it('falls back to generic review stage name', () => {
    const state = {} as AgentState;
    const result = incrementRetryNode(state);
    expect(result.retryCount).toBe(1);
    expect(result.messages?.[0]?.content).toContain('review');
  });
});
