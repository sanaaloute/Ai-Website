import { z } from 'zod';
import { StructuredTool } from '@langchain/core/tools';
import { toolToDefinition } from './tool-definitions';

enum NativeMode {
  Alpha = 'alpha',
  Beta = 'beta',
}

class DummyTool extends StructuredTool {
  name = 'dummy';
  description = 'dummy tool';
  schema = z.object({
    query: z.string().min(1).max(500).describe('the query'),
    limit: z.number().min(1).max(250).optional().describe('max results'),
    mode: z.enum(['a', 'b']),
    nativeMode: z.nativeEnum(NativeMode).optional(),
    refined: z.object({ x: z.number() }).refine(() => true),
  });
  async _call(): Promise<string> {
    return 'ok';
  }
}

describe('toolToDefinition', () => {
  const def = toolToDefinition(new DummyTool({}) as never);
  const props = def.function.parameters.properties as Record<string, Record<string, unknown>>;

  it('maps primitives with descriptions', () => {
    expect(props.query.type).toBe('string');
    expect(props.query.description).toBe('the query');
  });

  it('emits numeric min/max constraints', () => {
    expect(props.limit).toMatchObject({ type: 'number', minimum: 1, maximum: 250 });
  });

  it('emits string length constraints', () => {
    expect(props.query).toMatchObject({ minLength: 1, maxLength: 500 });
  });

  it('emits zod enum values', () => {
    expect(props.mode).toMatchObject({ type: 'string', enum: ['a', 'b'] });
  });

  it('emits native enum values instead of degrading to a bare string', () => {
    expect(props.nativeMode).toMatchObject({ type: 'string', enum: ['alpha', 'beta'] });
  });

  it('unwraps ZodEffects (.refine) to the inner object schema', () => {
    expect(props.refined.type).toBe('object');
    expect((props.refined.properties as Record<string, unknown>).x).toMatchObject({ type: 'number' });
  });

  it('computes required fields', () => {
    expect(def.function.parameters.required).toEqual(['query', 'mode', 'refined']);
  });
});
