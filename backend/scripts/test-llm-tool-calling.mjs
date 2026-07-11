#!/usr/bin/env node
/**
 * Test which LLM models are reachable through the configured AI gateway and
 * whether they emit native OpenAI-style tool/function calls.
 *
 * Usage:
 *   cd backend-nestjs
 *   # env vars are read from process.env first, then from the root .env file
 *   node scripts/test-llm-tool-calling.mjs
 *
 * Environment variables:
 *   AI_BASE_URL        - gateway base URL (default: https://api.gitcc.com/v1)
 *   AI_API_KEY         - API key used for Authorization + X-AI-Website-Gateway-Key
 *   TEST_MODELS        - comma-separated override list of models to test
 *   TEST_FORCE_TOOL    - "true" to send tool_choice: "required" (default: false)
 *   TIMEOUT_MS         - per-request timeout (default: 30000)
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

// Load the project root .env relative to this script. Real env vars win.
loadEnvFile(resolve(__dirname, '../../.env'));

const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.gitcc.com/v1').replace(/\/+$/, '');
const AI_API_KEY = process.env.AI_API_KEY || process.env.NEW_API_KEY || '';
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '30000', 10);
const FORCE_TOOL = (process.env.TEST_FORCE_TOOL || 'false').toLowerCase() === 'true';

const DEFAULT_MODELS = [
  process.env.AI_DEFAULT_MODEL,
  process.env.AI_REFLECTION_MODEL,
  'gpt-5.4',
  'qwen-max',
  'kimi-k2.5',
].filter(Boolean);

const TEST_MODELS = (process.env.TEST_MODELS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const MODELS = TEST_MODELS.length ? TEST_MODELS : [...new Set(DEFAULT_MODELS)];

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'List the files in a directory on the filesystem.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Absolute or relative directory path.',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file from the filesystem.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Absolute or relative file path.',
          },
        },
        required: ['path'],
      },
    },
  },
];

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

async function fetchWithTimeout(url, options, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function pingModel(model) {
  const body = {
    model,
    messages: [{ role: 'user', content: 'hi' }],
    max_tokens: 5,
    stream: false,
  };
  try {
    const res = await fetchWithTimeout(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: makeHeaders(),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, error: text.slice(0, 300) };
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: true, content: text.slice(0, 60) };
    }
    const content =
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.delta?.content ||
      '(empty)';
    return { ok: true, content: String(content).slice(0, 60) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function testToolCalling(model) {
  const body = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful assistant with access to filesystem tools. Use tools when appropriate.',
      },
      {
        role: 'user',
        content:
          'Please list the files in the project root directory and then read README.md.',
      },
    ],
    tools: TOOLS,
    tool_choice: FORCE_TOOL ? 'required' : 'auto',
    temperature: 0.3,
    stream: false,
  };

  try {
    const res = await fetchWithTimeout(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: makeHeaders(),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, error: text.slice(0, 300) };
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, error: `Non-JSON response: ${text.slice(0, 200)}` };
    }

    const choice = data.choices?.[0] || {};
    const message = choice.message || {};
    const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];

    if (toolCalls.length > 0) {
      return {
        ok: true,
        toolCalls: toolCalls.map((tc) => ({
          id: tc.id,
          name: tc.function?.name,
          arguments: tc.function?.arguments,
        })),
        content: message.content || null,
        finishReason: choice.finish_reason,
      };
    }

    return {
      ok: true,
      toolCalls: [],
      content: message.content || null,
      finishReason: choice.finish_reason,
      note: 'Model returned content but no tool_calls',
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function listAvailableModels() {
  try {
    const res = await fetchWithTimeout(
      `${AI_BASE_URL}/models`,
      { headers: { Authorization: `Bearer ${AI_API_KEY}` } },
      10000,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.data)) return null;
    return data.data
      .map((m) => m.id || m.model || JSON.stringify(m))
      .filter(Boolean);
  } catch {
    return null;
  }
}

async function main() {
  if (!AI_API_KEY) {
    console.error(
      'Missing AI_API_KEY. Set it in the environment or in the root .env file',
    );
    process.exit(1);
  }

  console.log(`AI gateway: ${AI_BASE_URL}`);
  console.log(`Models to test: ${MODELS.join(', ')}`);
  console.log(`tool_choice: ${FORCE_TOOL ? 'required' : 'auto'}`);
  console.log('');

  const availableModels = await listAvailableModels();
  if (availableModels) {
    const shown = availableModels.slice(0, 30);
    console.log(
      `Gateway reports ${availableModels.length} model(s): ${shown.join(', ')}${
        availableModels.length > 30 ? ' ...' : ''
      }`,
    );
    console.log('');
  } else {
    console.log('Gateway /models endpoint not available or returned an error.');
    console.log('');
  }

  const results = [];

  for (const model of MODELS) {
    const ping = await pingModel(model);
    if (!ping.ok) {
      console.log(`[${model}] PING  FAIL  ${ping.status || ''} ${ping.error}`);
      results.push({
        model,
        ping,
        tool: { ok: false, note: 'skipped because ping failed' },
      });
      console.log('');
      continue;
    }
    console.log(`[${model}] PING  OK    "${ping.content}"`);

    const tool = await testToolCalling(model);
    if (!tool.ok) {
      console.log(
        `[${model}] TOOLS FAIL  ${tool.status || ''} ${tool.error}`,
      );
    } else if (tool.toolCalls.length > 0) {
      console.log(
        `[${model}] TOOLS OK    ${tool.toolCalls.length} tool call(s)`,
      );
      for (const tc of tool.toolCalls) {
        console.log(`             • ${tc.name}(${tc.arguments})`);
      }
      if (tool.content) {
        console.log(`             content: ${tool.content.slice(0, 100)}`);
      }
    } else {
      console.log(`[${model}] TOOLS NONE  ${tool.note || ''}`);
      if (tool.content) {
        console.log(`             content: ${tool.content.slice(0, 100)}`);
      }
    }

    results.push({ model, ping, tool });
    console.log('');
  }

  console.log('=== Summary ===');
  console.table(
    results.map((r) => {
      const toolCalls = r.tool.toolCalls?.length ?? 0;
      return {
        model: r.model,
        ping: r.ping.ok ? 'OK' : `FAIL ${r.ping.status || ''}`,
        tools: r.tool.ok
          ? toolCalls > 0
            ? `${toolCalls} call(s)`
            : 'none'
          : `FAIL ${r.tool.status || ''}`,
        note:
          r.tool.note ||
          r.tool.error ||
          r.ping.error ||
          '',
      };
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
