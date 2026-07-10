#!/usr/bin/env node
/**
 * End-to-end smoke test for P1 agent flow.
 *
 * Verifies:
 * - create sandbox
 * - create agent session + enqueue job
 * - SSE stream includes snapshot + file_update metadata events
 * - generation completes (done or error) within a timeout
 * - edit flow reuses the same sandbox
 * - sandbox can be killed
 *
 * Run with a valid access token:
 *   TOKEN=<jwt> node scripts/smoke-agent-p1.mjs
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error('Missing TOKEN env var');
  process.exit(1);
}

const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`POST ${path} failed ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`GET ${path} failed ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function readSSE(url, onEvent, timeoutMs = 6 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`SSE timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    fetch(`${BASE_URL}${url}`, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'text/event-stream' },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          clearTimeout(timer);
          reject(new Error(`SSE ${url} failed ${res.status}: ${text}`));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6).trim();
              if (!payload) continue;
              let event;
              try {
                event = JSON.parse(payload);
              } catch {
                continue;
              }
              onEvent(event);
              if (event.type === 'done' || event.type === 'error') {
                clearTimeout(timer);
                reader.cancel();
                resolve(event);
                return;
              }
            }
          }
          clearTimeout(timer);
          resolve({ type: 'closed' });
        } catch (err) {
          clearTimeout(timer);
          reject(err);
        }
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function getSandboxFile(sandboxId, filePath) {
  const res = await fetch(
    `${BASE_URL}/api/get-sandbox-file?sandboxId=${encodeURIComponent(sandboxId)}&path=${encodeURIComponent(filePath)}`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`GET /api/get-sandbox-file failed ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function runFlow(name, sandboxId, prompt) {
  console.log(`\n[${name}] Creating session...`);
  const session = await apiPost('/api/agent-sessions', { prompt });
  const sessionId = session.sessionId;
  console.log(`[${name}] Session ${sessionId}`);

  console.log(`[${name}] Enqueuing job...`);
  const job = await apiPost('/api/agent-stream', { sessionId, sandboxId });
  const jobId = job.jobId;
  console.log(`[${name}] Job ${jobId}`);

  const events = [];
  let snapshotSeen = false;
  let fileUpdateSeen = false;
  let previewSeen = false;
  let snapshotId = null;

  const result = await readSSE(
    `/api/agent-stream/${jobId}`,
    (event) => {
      events.push(event);
      if (event.type === 'snapshot') {
        snapshotSeen = true;
        snapshotId = event.data.snapshotId;
      }
      if (event.type === 'file_update') fileUpdateSeen = true;
      if (event.type === 'preview') previewSeen = true;
      if (['status', 'file_update', 'snapshot', 'preview', 'done', 'error'].includes(event.type)) {
        console.log(`[${name}] event: ${event.type}`, JSON.stringify(event.data).slice(0, 160));
      }
    },
  );

  console.log(`[${name}] Final event: ${result.type}`);
  console.log(`[${name}] snapshot=${snapshotSeen} file_update=${fileUpdateSeen} preview=${previewSeen} snapshotId=${snapshotId} totalEvents=${events.length}`);

  return { result, snapshotSeen, fileUpdateSeen, previewSeen, snapshotId, events };
}

async function main() {
  console.log('Creating sandbox...');
  const sandbox = await apiPost('/api/create-ai-sandbox-v2', { projectName: 'p1-smoke' });
  const sandboxId = sandbox.sandboxId;
  console.log(`Sandbox ${sandboxId} url=${sandbox.url}`);

  const flow1 = await runFlow(
    'new_app',
    sandboxId,
    'Build a simple single-page React app with a heading "Hello P1" and a button labeled "Click me". Use only one file, App.jsx.',
  );

  if (flow1.result.type === 'error') {
    throw new Error(`new_app flow failed: ${JSON.stringify(flow1.result.data)}`);
  }
  if (!flow1.snapshotSeen) throw new Error('new_app flow did not emit snapshot event');
  if (!flow1.fileUpdateSeen) throw new Error('new_app flow did not emit file_update event');
  if (!flow1.previewSeen) throw new Error('new_app flow did not emit preview event');

  const flow2 = await runFlow(
    'edit',
    sandboxId,
    'Change the button text to "Get Started" and make the heading say "P1 Smoke Test". Do not change anything else.',
  );

  if (flow2.result.type === 'error') {
    throw new Error(`edit flow failed: ${JSON.stringify(flow2.result.data)}`);
  }
  if (!flow2.snapshotSeen) throw new Error('edit flow did not emit snapshot event');
  if (!flow2.fileUpdateSeen) throw new Error('edit flow did not emit file_update event');

  console.log('\n[rollback] Restoring to edit snapshot (undo the edit)...');
  const restore1 = await apiPost('/api/sandbox-snapshot/restore', {
    sandboxId,
    snapshotId: flow2.snapshotId,
  });
  if (!restore1.success) throw new Error('Rollback to edit snapshot failed');
  const afterRollback = await getSandboxFile(sandboxId, 'src/App.tsx');
  if (afterRollback.content.includes('P1 Smoke Test')) {
    throw new Error('Rollback did not revert the edited heading text');
  }
  if (!afterRollback.content.includes('Hello P1')) {
    throw new Error('Rollback did not restore the original heading');
  }
  console.log('[rollback] Reverted to original heading');

  console.log('\n[rollback] Restoring to new_app snapshot (pre-generation workspace)...');
  const restore2 = await apiPost('/api/sandbox-snapshot/restore', {
    sandboxId,
    snapshotId: flow1.snapshotId,
  });
  if (!restore2.success) throw new Error('Rollback to new_app snapshot failed');
  // The pre-new_app snapshot was taken before the agent wrote any files, so
  // src/App.tsx should no longer exist.
  try {
    await getSandboxFile(sandboxId, 'src/App.tsx');
    throw new Error('Pre-generation snapshot unexpectedly contains src/App.tsx');
  } catch (err) {
    if (!err.message.includes('File not found')) throw err;
  }
  console.log('[rollback] Pre-generation snapshot removed agent-created files as expected');

  console.log('\nKilling sandbox...');
  await apiPost('/api/kill-sandbox', { sandboxId });
  console.log('Sandbox killed.');

  console.log('\n✅ P1 smoke test passed');
}

main().catch((err) => {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
});
