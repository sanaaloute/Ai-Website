#!/usr/bin/env node
/**
 * Test planner + pre-flight validator in sequence.
 *
 * Usage:
 *   cd backend-nestjs
 *   node scripts/test-planner-preflight.mjs "Create a personal portfolio website"
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

async function chat(system, user) {
  const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: makeHeaders(),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      stream: false,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Gateway error ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = JSON.parse(text);
  return data.choices?.[0]?.message?.content || '';
}

async function main() {
  if (!AI_API_KEY) {
    console.error('Missing AI_API_KEY');
    process.exit(1);
  }

  const plannerPrompt = readFileSync(resolve(__dirname, '../src/prompts/planner.md'), 'utf8');
  const validatorPrompt = readFileSync(resolve(__dirname, '../src/prompts/pre-flight-validator.md'), 'utf8');

  const analyzerOutput = JSON.stringify({
    intent: 'new_app',
    scope: userRequest,
    relevantFiles: ['src/App.tsx', 'src/main.tsx'],
    websiteCategory: 'personal',
    websiteType: 'portfolio',
  });

  console.log('--- Planner call ---');
  const plannerText = await chat(
    plannerPrompt,
    `Analyzer output: ${analyzerOutput}\n\nUser request: ${userRequest}`,
  );
  const plan = extractJson(plannerText) || {};
  console.log('Plan steps:', Array.isArray(plan.steps) ? plan.steps.length : 0);

  const validatorContext = JSON.stringify({
    analyzer: {
      intent: 'new_app',
      scope: userRequest,
      relevantFiles: ['src/App.tsx', 'src/main.tsx'],
    },
    planner: {
      summary: plan.summary || '',
      steps: plan.steps || [],
      design: plan.design || '',
      newFiles: plan.newFiles || [],
    },
  });

  console.log('\n--- Pre-flight validator call ---');
  const validatorText = await chat(validatorPrompt, validatorContext);
  const validation = extractJson(validatorText) || {};
  console.log(JSON.stringify(validation, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
