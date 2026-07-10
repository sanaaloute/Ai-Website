import type { StructuredTool } from '@langchain/core/tools';

/**
 * OpenAI-compatible tool definition used by the AI gateway.
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface ZodFieldLike {
  _def?: Record<string, unknown>;
  description?: string;
  isOptional?: () => boolean;
  shape?: Record<string, unknown>;
  unwrap?: () => ZodFieldLike;
  element?: ZodFieldLike;
}

function getTypeName(field: ZodFieldLike): string | undefined {
  return (field._def?.typeName as string) || undefined;
}

function getDescription(field: ZodFieldLike): string {
  return (field.description as string) || (field._def?.description as string) || '';
}

/**
 * Recursively convert a Zod-like field into a JSON-schema-ish object.
 * This is best-effort based on Zod internals.
 */
function fieldToSchema(field: unknown): Record<string, unknown> {
  const f = field as ZodFieldLike;
  const typeName = getTypeName(f);

  // Optional / nullable wrappers
  if (typeName === 'ZodOptional' || typeName === 'ZodNullable') {
    const inner = f.unwrap ? f.unwrap() : (f._def?.innerType as ZodFieldLike);
    return inner ? fieldToSchema(inner) : { type: 'string' };
  }

  if (typeName === 'ZodDefault' && f._def?.innerType) {
    return fieldToSchema(f._def.innerType as ZodFieldLike);
  }

  // Primitives
  if (typeName === 'ZodBoolean' || f._def?.coerce === true) {
    return { type: 'boolean', description: getDescription(f) };
  }
  if (typeName === 'ZodNumber') {
    return { type: 'number', description: getDescription(f) };
  }
  if (typeName === 'ZodString') {
    return { type: 'string', description: getDescription(f) };
  }

  // Enum
  if (typeName === 'ZodEnum' && Array.isArray(f._def?.values)) {
    return { type: 'string', enum: f._def.values, description: getDescription(f) };
  }
  if (typeName === 'ZodNativeEnum') {
    return { type: 'string', description: getDescription(f) };
  }

  // Array
  if (typeName === 'ZodArray') {
    const element = f.element || (f._def?.type as ZodFieldLike);
    return {
      type: 'array',
      items: element ? fieldToSchema(element) : { type: 'string' },
      description: getDescription(f),
    };
  }

  // Object
  if (typeName === 'ZodObject' || f.shape) {
    const shape = f.shape || ((f._def?.shape as unknown as (() => Record<string, unknown>))?.());
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    if (shape && typeof shape === 'object') {
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = fieldToSchema(value);
        const child = value as ZodFieldLike;
        if (typeof child.isOptional !== 'function' || !child.isOptional()) {
          required.push(key);
        }
      }
    }
    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      description: getDescription(f),
    };
  }

  // Fallback
  return { type: 'string', description: getDescription(f) };
}

function isOptionalField(field: unknown): boolean {
  const f = field as ZodFieldLike;
  if (typeof f.isOptional === 'function') return f.isOptional();
  if (getTypeName(f) === 'ZodOptional') return true;
  if (f._def?.defaultValue !== undefined) return true;
  return false;
}

/**
 * Convert a LangChain StructuredTool into an OpenAI-compatible ToolDefinition.
 */
export function toolToDefinition(tool: StructuredTool): ToolDefinition {
  const schema = (tool as unknown as { schema?: ZodFieldLike }).schema;
  const shape = schema?.shape || ((schema?._def?.shape as unknown as (() => Record<string, unknown>))?.());

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  if (shape && typeof shape === 'object') {
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = fieldToSchema(value);
      if (!isOptionalField(value)) {
        required.push(key);
      }
    }
  }

  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      },
    },
  };
}

/**
 * Convert a set of LangChain tools into gateway-compatible definitions.
 */
export function toolsToDefinitions(tools: StructuredTool[]): ToolDefinition[] {
  return tools.map(toolToDefinition);
}
