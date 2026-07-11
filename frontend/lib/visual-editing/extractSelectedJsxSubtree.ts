import ts from 'typescript';

import type { ComponentSelection } from '@/lib/visual-editing/types';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Byte offset of `data-dyad-id` value matching AI-Website preview ids. */
function findDataDyadAnchorPosition(source: string, dyadId: string): number | null {
  const escaped = escapeRegex(dyadId);
  const double = new RegExp(`data-dyad-id\\s*=\\s*"${escaped}"`);
  const single = new RegExp(`data-dyad-id\\s*=\\s*'${escaped}'`);
  for (const re of [double, single]) {
    const m = re.exec(source);
    if (m) return m.index;
  }
  return null;
}

/**
 * Smallest JSX element whose opening tag range contains `pos` and (when possible) declares this `data-dyad-id`.
 */
function findJsxNodeForVisualSelection(
  sf: ts.SourceFile,
  source: string,
  pos: number,
  dyadId: string
): ts.JsxElement | ts.JsxSelfClosingElement | null {
  let best: ts.JsxElement | ts.JsxSelfClosingElement | null = null;
  let bestW = Infinity;
  const anchorInSource = findDataDyadAnchorPosition(source, dyadId) !== null;

  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const a = node.getStart(sf, false);
      const b = node.getEnd();
      if (pos < a || pos >= b) {
        ts.forEachChild(node, visit);
        return;
      }
      const openEnd = ts.isJsxElement(node) ? node.openingElement.getEnd() : node.getEnd();
      const openSlice = source.slice(a, openEnd);
      const idDouble = `data-dyad-id="${dyadId}"`;
      const idSingle = `data-dyad-id='${dyadId}'`;
      const hasDyad =
        openSlice.includes(idDouble) ||
        openSlice.includes(idSingle) ||
        openSlice.includes(`data-dyad-id={"${dyadId}"}`) ||
        (openSlice.includes('data-dyad-id={`') && openSlice.includes(dyadId));

      const accept = anchorInSource ? hasDyad : true;
      if (accept) {
        const w = b - a;
        if (w < bestW) {
          best = node;
          bestW = w;
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  if (best) return best;

  // Fallback: anchor or line-based position inside some JSX, but opening-tag string match failed (unusual formatting).
  let fallback: ts.JsxElement | ts.JsxSelfClosingElement | null = null;
  let fallbackW = Infinity;
  const visitFallback = (node: ts.Node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const a = node.getStart(sf, false);
      const b = node.getEnd();
      if (pos >= a && pos < b) {
        const w = b - a;
        if (w < fallbackW) {
          fallback = node;
          fallbackW = w;
        }
      }
    }
    ts.forEachChild(node, visitFallback);
  };
  visitFallback(sf);
  return fallback;
}

type SelectedJsxSlice = {
  snippet: string;
  startLine: number;
  endLine: number;
  start: number;
  end: number;
};

/**
 * Extract the JSX subtree the user selected in the preview (`data-dyad-id` + file).
 * Falls back to null if the file does not parse as TSX or the node cannot be resolved.
 */
export function extractSelectedJsxSubtree(
  source: string,
  selection: ComponentSelection
): SelectedJsxSlice | null {
  const fileName = selection.relativePath.split('/').pop() || 'Component.tsx';
  let sf: ts.SourceFile;
  try {
    sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  } catch {
    return null;
  }

  const anchor = findDataDyadAnchorPosition(source, selection.id);
  let pos: number;
  if (anchor != null) {
    pos = anchor;
  } else {
    const line = Math.max(0, selection.lineNumber - 1);
    const col = Math.max(0, selection.columnNumber - 1);
    pos = sf.getPositionOfLineAndCharacter(line, col);
    if (pos >= source.length) pos = Math.max(0, source.length - 1);
  }

  const node = findJsxNodeForVisualSelection(sf, source, pos, selection.id);
  if (!node) return null;

  const start = node.getStart(sf, false);
  const end = node.getEnd();
  const snippet = source.slice(start, end);
  const lcStart = sf.getLineAndCharacterOfPosition(start);
  const lcEnd = sf.getLineAndCharacterOfPosition(end);
  return {
    snippet,
    startLine: lcStart.line + 1,
    endLine: lcEnd.line + 1,
    start,
    end
  };
}
