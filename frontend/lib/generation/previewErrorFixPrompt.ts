/**
 * Prompts sent to the AI when the sandbox preview reports build/runtime errors.
 */

/** Shared step-by-step expectations for repair messages. */
export const PREVIEW_FIX_CHAIN_OF_THOUGHT = `### How to solve (chain-of-thought — follow in order)
1. **Locate**: Identify the EXACT failing file or module using any \`src/...\` paths, stack frames, or import names in the error. If the report only shows a preview URL with \`:line:column\`, that often refers to the **bundled document** — infer the real source file from the stack, recent edits, or the module graph.
2. **Diagnose**: Write one short sentence stating the **root cause** (not the symptom alone).
3. **Plan**: List the minimal edits (file + change) before writing code.
4. **Fix**: Apply only those edits; keep imports/exports and paths valid.
5. **Verify**: Confirm Next.js would compile and the app would render without this error.

**CRITICAL OUTPUT RULES**:
- ONLY modify files explicitly mentioned in the error, stack trace, or unresolved imports.
- Do NOT touch, rewrite, or output any file that is unrelated to the error.
- If the fix requires only one file, output ONLY that one file.
- Return complete file contents for any file you change, using \`<file path="...">\` blocks.`;

function summarizePreviewErrorContext(rawError: string): string {
  const text = rawError.trim();
  if (!text) return '';

  const bullets: string[] = [];

  const uncaught = text.match(/Uncaught\s+(\S+)/);
  if (uncaught) {
    bullets.push(`- **Signal**: ${uncaught[0]}`);
  }

  const named = text.match(
    /\b(ReferenceError|SyntaxError|TypeError|RangeError|URIError|AggregateError)\b/
  );
  if (named && !uncaught) {
    bullets.push(`- **Error class**: ${named[1]}`);
  }

  const srcPath =
    text.match(/(\/(?:app|components|lib)\/[^\s'")\]]+\.(?:jsx|tsx|js|ts))\b/i) ||
    text.match(/\b((?:app|components|lib)\/[^\s'")\]]+\.(?:jsx|tsx|js|ts))\b/i);
  if (srcPath) {
    bullets.push(`- **Project path referenced**: \`${srcPath[1]}\``);
  }

  const home = text.match(/\/home\/user\/app\/[^\s'")\]]+/);
  if (home) {
    bullets.push(`- **Sandbox absolute path**: \`${home[0]}\``);
  }

  if (/\.e2b\.app/i.test(text)) {
    bullets.push(
      `- **Preview host**: URL line/column may not map 1:1 to a single \`.tsx\` line — use stack traces and \`app/\` or \`components/\` paths when available.`
    );
  }

  return bullets.join('\n');
}

export function buildPreviewErrorFixPrompt(rawError: string): string {
  const err = rawError.trim();
  const parsed = summarizePreviewErrorContext(err);

  return (
    `### Preview failure (sandbox)\n` +
    `A runtime or build error was reported from the live preview iframe.\n\n` +
    `#### Error (verbatim)\n` +
    `\`\`\`text\n${err}\n\`\`\`\n\n` +
    (parsed ? `#### Auto-extracted context\n${parsed}\n\n` : '') +
    `${PREVIEW_FIX_CHAIN_OF_THOUGHT}\n`
  );
}

export function buildPreviewHealthFixPrompt(rawIssue: string): string {
  const issue = rawIssue.trim();

  return (
    `### Preview health check\n` +
    `The preview did not reach a healthy render after applying code.\n\n` +
    `#### Observed issue\n` +
    `\`\`\`text\n${issue}\n\`\`\`\n\n` +
    `${PREVIEW_FIX_CHAIN_OF_THOUGHT}\n`
  );
}
