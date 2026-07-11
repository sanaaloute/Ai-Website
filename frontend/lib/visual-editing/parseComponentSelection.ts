import { normalizePath } from '@/lib/visual-editing/normalizePath';
import type { ComponentSelection } from '@/lib/visual-editing/types';

/**
 * Parses `data-dyad-id` from the preview DOM.
 * Supports:
 * - `relativePath:line:column` (Dyad-style)
 * - `relativePath:line` (AI-Website codegen often omits column)
 */
export function parseDataDyadId(id: string): {
  relativePath: string;
  lineNumber: number;
  columnNumber: number;
} | null {
  const trimmed = id.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(':');
  if (parts.length < 2) return null;

  const last = parts[parts.length - 1]!;
  const secondLast = parts[parts.length - 2]!;

  // `path:line:column` — last two segments are numeric
  if (parts.length >= 3 && /^\d+$/.test(last) && /^\d+$/.test(secondLast)) {
    const columnStr = parts.pop()!;
    const lineStr = parts.pop()!;
    const relativePath = parts.join(':');
    const lineNumber = parseInt(lineStr, 10);
    const columnNumber = parseInt(columnStr, 10);
    if (!relativePath || isNaN(lineNumber) || isNaN(columnNumber)) return null;
    return {
      relativePath: normalizePath(relativePath),
      lineNumber,
      columnNumber
    };
  }

  // `path:line` — single trailing line number (column defaults to 1)
  if (/^\d+$/.test(last)) {
    const lineStr = parts.pop()!;
    const relativePath = parts.join(':');
    const lineNumber = parseInt(lineStr, 10);
    if (!relativePath || isNaN(lineNumber)) return null;
    return {
      relativePath: normalizePath(relativePath),
      lineNumber,
      columnNumber: 1
    };
  }

  return null;
}

export function parseComponentSelection(data: unknown): ComponentSelection | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as { type?: string; component?: unknown };
  if (d.type !== 'dyad-component-selected') return null;

  const component = d.component as {
    id?: string;
    name?: string;
    runtimeId?: string;
  } | null;
  if (!component || typeof component.id !== 'string' || typeof component.name !== 'string') {
    return null;
  }

  const { id, name, runtimeId } = component;
  const parsed = parseDataDyadId(id);
  if (!parsed) {
    console.error(`Invalid component selection id format: "${id}"`);
    return null;
  }

  return {
    id,
    name,
    runtimeId,
    relativePath: parsed.relativePath,
    lineNumber: parsed.lineNumber,
    columnNumber: parsed.columnNumber
  };
}

/** Parse `filepath:line` or `filepath:line:column` id used by Dyad text/style messages. */
export function parseDyadComponentId(id: string): {
  relativePath: string;
  lineNumber: number;
  columnNumber: number;
} | null {
  return parseDataDyadId(id);
}
