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

  it('never mixes static and conditional edges from the same node', () => {
    // LangGraph follows BOTH a static edge and the conditional routes from the
    // same source node, running their targets in parallel. This previously
    // caused planner and executor to run concurrently after
    // database_initializer on the edit-with-DB path.
    const drawable = buildAgentGraph().getGraph();
    const edges = drawable.edges as Array<{ source: string; conditional: boolean }>;

    const staticSources = new Set(
      edges.filter((e) => !e.conditional).map((e) => e.source),
    );
    const conditionalSources = new Set(
      edges.filter((e) => e.conditional).map((e) => e.source),
    );

    const mixed = [...staticSources].filter((s) => conditionalSources.has(s));
    expect(mixed).toEqual([]);
  });

  it('keeps every conditional route target reachable as a real node', () => {
    const drawable = buildAgentGraph().getGraph();
    const nodeIds = new Set(Object.keys(drawable.nodes));
    for (const edge of drawable.edges as Array<{ source: string; target: string }>) {
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });
});
