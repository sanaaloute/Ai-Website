#!/usr/bin/env node
/**
 * Quick test for the analyzer prompt classification.
 *
 * Usage:
 *   cd backend-nestjs
 *   node scripts/test-analyzer-classification.mjs "Create a SaaS landing page"
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
const MODEL = process.env.TEST_MODEL || 'gpt-5.4';

const userMessage = process.argv[2] || 'Create a SaaS landing page with pricing and testimonials';

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

function extractJson(text) {
  if (!text) return null;
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function main() {
  if (!AI_API_KEY) {
    console.error('Missing AI_API_KEY');
    process.exit(1);
  }

  const systemPrompt = readFileSync(resolve(__dirname, '../src/prompts/analyze.md'), 'utf8');

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze this request: ${userMessage}` },
    ],
    temperature: 0.3,
    stream: false,
  };

  const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: makeHeaders(),
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`Gateway error ${res.status}: ${text.slice(0, 300)}`);
    process.exit(1);
  }

  const data = JSON.parse(text);
  const content = data.choices?.[0]?.message?.content || '';
  const parsed = extractJson(content);

  console.log('Raw response:\n', content);
  console.log('\nParsed classification:');
  console.log(JSON.stringify(parsed, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
