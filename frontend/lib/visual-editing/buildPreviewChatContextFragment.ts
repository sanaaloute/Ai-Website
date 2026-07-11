import { extractSelectedJsxSubtree } from '@/lib/visual-editing/extractSelectedJsxSubtree';
import type { ComponentSelection } from '@/lib/visual-editing/types';

export type ComponentLevelEditPromptOptions = {
  /** Full source of the file containing the component (typically the whole file). */
  componentCode: string;
  /** User instruction from the preview card or chat. */
  userTask: string;
  /** e.g. React + Next.js + Tailwind */
  style?: string;
  /** Project / AI-Website design constraints */
  designRules?: string;
  /** High-level layout / file structure hint */
  layoutSections?: string;
};

const DEFAULT_STYLE =
  'React + Next.js + Tailwind CSS (utility-first; use standard Tailwind classes from the official docs).';

const DEFAULT_DESIGN_RULES = [
  'Preserve data-dyad-id and data-dyad-name on JSX you touch (AI-Website preview visual select).',
  'Use standard Tailwind classes (e.g. bg-white, text-gray-900); avoid unrelated design-token renames unless already in the file.',
  'Do not introduce new frameworks, global stylesheets, or parent/sibling file edits unless strictly required to fulfill the task.'
].join(' ');

/** Match sandbox file keys to the preview-reported relative path. */
export function resolveSandboxFileContent(
  sandboxFiles: Record<string, string>,
  relativePath: string
): string | null {
  const trimmed = relativePath.trim();
  if (!trimmed) return null;
  const noLeading = trimmed.replace(/^\/+/, '');
  if (sandboxFiles[trimmed]) return sandboxFiles[trimmed];
  if (sandboxFiles[noLeading]) return sandboxFiles[noLeading];
  const keys = Object.keys(sandboxFiles);
  const hit = keys.find(
    (k) => k === trimmed || k.replace(/^\/+/, '') === noLeading || k.endsWith(noLeading)
  );
  return hit ? sandboxFiles[hit]! : null;
}

function escapeXmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** CDATA cannot contain `]]>`; split so embedded source stays valid. */
function escapeCdata(value: string): string {
  return value.replace(/\]\]>/g, ']]]]><![CDATA[>');
}

/**
 * COMPONENT-LEVEL EDIT PROMPT — use when the user selected a component in the preview.
 */
export function buildComponentLevelEditPrompt(
  c: ComponentSelection,
  options: ComponentLevelEditPromptOptions
): string {
  const style = (options.style ?? DEFAULT_STYLE).trim();
  const designRules = (options.designRules ?? DEFAULT_DESIGN_RULES).trim();
  let layoutSections = (options.layoutSections ?? '(Not specified)').trim();
  if (layoutSections.length > 12000) {
    layoutSections = `${layoutSections.slice(0, 12000)}\n…(truncated)`;
  }
  const rawCode = options.componentCode.trim();
  const safeCode = rawCode
    ? rawCode
    : '(Source not available in sandbox cache — edit only the file below at the opening tag near the reported line; do not guess other files.)';
  const task = options.userTask.trim();
  const taskBlock = task
    ? task
    : '(No instruction in the preview card — infer the task from the surrounding chat, if any.)';

  const slice = rawCode ? extractSelectedJsxSubtree(rawCode, c) : null;

  const scopeBlock = slice
    ? `
RESOLVED SELECTION (mandatory — this is the ONLY JSX you may change):
- File: ${c.relativePath}
- Preview id: ${c.id}
- Lines ${slice.startLine}–${slice.endLine} (1-based) in that file
- The substring below must appear exactly once in the full file CDATA; your final file replaces ONLY that substring with your updated version.

<SelectedSubtree lines="${slice.startLine}-${slice.endLine}" id="${escapeXmlAttr(c.id)}">
<![CDATA[
${escapeCdata(slice.snippet)}
]]>
</SelectedSubtree>

MERGE RULE (critical):
1. Start from the COMPLETE file in <Component> below (verbatim).
2. Find the exact SelectedSubtree text once inside that file.
3. Replace only that range with your edited subtree (apply TASK inside it).
4. Every character outside that range must stay identical (imports, other sections, other data-dyad-* elements, hooks, state).
5. Output one full <file path="${escapeXmlAttr(c.relativePath)}">…</file> with the merged result — not a partial file, not multiple files.
`
    : `
SELECTION WARNING:
Could not resolve a single JSX subtree for this preview id. Prefer editing only the element that carries data-dyad-id="${escapeXmlAttr(c.id)}" and avoid unrelated sections.
`;

  return `COMPONENT-LEVEL EDIT PROMPT

You are editing ONE visually selected region inside ${escapeXmlAttr(c.relativePath)} — not the whole app unless the selection is the root.
${scopeBlock}
Selected click target label (use this as the primary intent anchor inside the selected subtree):
- ${escapeXmlAttr(c.name)}

Full file (authoritative source for merge — preserve everything outside the selected subtree):

<Component id="${escapeXmlAttr(c.id)}" file="${escapeXmlAttr(c.relativePath)}">
<![CDATA[
${escapeCdata(safeCode)}
]]>
</Component>

APP CONTEXT:

* Style: ${style}
* Design rules: ${designRules}
* Layout: ${layoutSections}

STRICT CONSTRAINTS:

* Only modify the SELECTED SUBTREE (see above). If a subtree was resolved, do not edit other JSX, imports, or logic.
* Do NOT modify parent or sibling components outside that subtree (same file is OK only inside the subtree).
* Do NOT change global styles or unrelated classNames outside the subtree.
* Do NOT change layout structure outside the subtree.
* Keep all existing functionality intact.
* STYLE SCOPE RULE: for text color/background color requests, edit the most specific target element(s) inside the selected subtree. Avoid applying 'text-*'/'bg-*' classes on broad wrapper/parent nodes when that would cascade to unrelated descendants.
* If a color change is ambiguous, prefer changing the direct text/content node the user likely clicked (heading, paragraph, button label) rather than the outer container.
* If the selected click target label points to a text node (example: "h2: My Gang Gang"), apply color classes on that exact text element, not on section/container wrappers.
* For color-only requests, do NOT change className/style on the selected subtree ROOT opening tag unless the target label itself clearly indicates that root element.

TASK:
${taskBlock}

OUTPUT REQUIREMENTS:

* Return one <file path="${escapeXmlAttr(c.relativePath)}"> containing the ENTIRE updated file after merge.
* Outside the selected subtree, the file must match the original character-for-character.
* Inside the subtree, apply minimal changes for TASK only.
* Keep structure as close as possible to the original inside the subtree.`;
}


