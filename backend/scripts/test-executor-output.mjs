#!/usr/bin/env node
/**
 * Test the executor prompt in isolation to see what the model outputs.
 *
 * Usage:
 *   cd backend-nestjs
 *   node scripts/test-executor-output.mjs "Create a personal portfolio website"
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(resolve(__dirname, '../../.env'));

const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.gitcc.com/v1').replace(/\/+$/, '');
const AI_API_KEY = process.env.AI_API_KEY || process.env.NEW_API_KEY || '';
const MODEL = process.env.TEST_MODEL || 'kimi-k2.5';

const userRequest = process.argv[2] || 'Create a personal portfolio website';

function makeHeaders() {
  const h = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${AI_API_KEY}`,
  };
  if (AI_API_KEY) {
    h['X-AI-Website-Gateway-Key'] = AI_API_KEY;
  }
  return h;
}

function extractContent(text) {
  if (!text || !text.trim().startsWith('{')) return text;
  try {
    const data = JSON.parse(text);
    const choices = data.choices;
    if (Array.isArray(choices) && choices.length > 0) {
      const message = choices[0].message;
      if (message?.content) return message.content;
      const delta = choices[0].delta;
      if (delta?.content) return delta.content;
    }
  } catch {
    // ignore
  }
  return text;
}

async function main() {
  if (!AI_API_KEY) {
    console.error('Missing AI_API_KEY');
    process.exit(1);
  }

  const systemPrompt = readFileSync(resolve(__dirname, '../src/prompts/executor.md'), 'utf8');

  const context = JSON.stringify({
    workflow: 'new_app',
    intent: 'new_app',
    userRequest,
    scope: userRequest,
    relevantFiles: ['src/App.tsx', 'src/main.tsx'],
    mode: 'OVERWRITE',
    instruction: 'You are building a new website from scratch. Overwrite ALL existing scaffold files to match the design spec. Create new section components.',
    design: 'Minimal personal portfolio: warm cream #faf8f5 background, dark text #1f1a17, terracotta accent #c75b39. Clean sans-serif typography.',
    newFiles: ['src/components/sections/Hero.tsx', 'src/components/sections/About.tsx'],
    steps: [
      'Step 1: Overwrite src/App.tsx to render the portfolio layout',
      'Step 2: Create src/components/sections/Hero.tsx',
      'Step 3: Create src/components/sections/About.tsx',
    ],
  }, null, 2);

  const outputFormatInstruction = `

## Output Format (CRITICAL)

Return your code changes as Markdown code blocks. The info string MUST be the exact file path.

Example:

\`\`\`src/App.tsx
export default function App() { return <div>Hello</div>; }
\`\`\`

You may include a brief note outside the code blocks, but every file change must be in a code block.
`;

  const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: makeHeaders(),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt + outputFormatInstruction },
        { role: 'user', content: `Context:\n${context}\n\nExecute now.` },
      ],
      temperature: 0.7,
      stream: false,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`Gateway error ${res.status}: ${text.slice(0, 300)}`);
    process.exit(1);
  }

  const content = extractContent(text);
  console.log('=== Raw executor response ===');
  console.log(content);

  const filePattern = /```(?:([\w/\.\-]+))?\n([\s\S]*?)\n```/g;
  const files = [];
  let match;
  while ((match = filePattern.exec(content)) !== null) {
    files.push({ path: match[1], content: match[2] });
  }
  console.log('\n=== Parsed files ===');
  console.log(JSON.stringify(files.map((f) => ({ path: f.path, length: f.content?.length })), null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
