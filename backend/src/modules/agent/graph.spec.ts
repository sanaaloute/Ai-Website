import { buildAgentGraph } from './graph';

jest.mock('@/lib/e2b.service', () => ({
  E2BService: class MockE2BService {},
}));

describe('Agent graph', () => {
  it('compiles without errors', () => {
    const graph = buildAgentGraph();
    expect(graph).toBeDefined();
    expect(typeof graph.invoke).toBe('function');
  });
});
