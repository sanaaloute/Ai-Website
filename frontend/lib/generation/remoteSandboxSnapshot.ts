const REMOTE_SNAPSHOT_VERSION = 1 as const;
export const REMOTE_SNAPSHOT_EMPTY_STRUCTURE = 'No sandbox created yet';

const MAX_REMOTE_FILE_COUNT = 500;
const MAX_REMOTE_FILE_CHARS = 500_000;
const MAX_REMOTE_TOTAL_CHARS = 10_000_000;
const MAX_REMOTE_CHAT_MESSAGES = 1_000;
const MAX_REMOTE_CHAT_BYTES = 5_000_000;

type RemoteSandboxChatMessageV1 = {
  content: string;
  type: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
};

type RemoteSandboxSnapshotV1 = {
  version: typeof REMOTE_SNAPSHOT_VERSION;
  projectId: string;
  projectName: string;
  fileStructure: string;
  structureContent: string;
  sandboxFiles: Record<string, string>;
  chat: RemoteSandboxChatMessageV1[];
  updatedAt: number;
};

function sanitizeSnapshotSandboxId(raw: string): string {
  return raw.trim().replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120);
}

/** True when `value` is a canonical UUID string (matches `projects.id` in Supabase). */
export function isUuidProjectId(value: string | null | undefined): boolean {
  const v = (value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function trimString(input: unknown, maxChars: number, label?: string): string {
  const value = typeof input === 'string' ? input : '';
  if (value.length <= maxChars) return value;
  if (label) {
    console.warn(`[remoteSnapshot] Truncated ${label} (${value.length} chars → ${maxChars})`);
  }
  return `${value.slice(0, maxChars)}\n/* …truncated by AI-Website snapshot limit (${value.length} chars → ${maxChars}) … */`;
}

function trimSnapshotFiles(input: unknown): Record<string, string> {
  const rows =
    input && typeof input === 'object'
      ? Object.entries(input as Record<string, unknown>)
      : [];

  const out: Record<string, string> = {};
  let totalChars = 0;

  for (const [rawPath, rawContent] of rows.slice(0, MAX_REMOTE_FILE_COUNT)) {
    const path = trimString(rawPath, 300);
    if (!path) continue;

    const content = trimString(rawContent, MAX_REMOTE_FILE_CHARS, path);
    const addSize = path.length + content.length;
    if (totalChars + addSize > MAX_REMOTE_TOTAL_CHARS) break;

    out[path] = content;
    totalChars += addSize;
  }

  return out;
}

function trimSnapshotChat(input: unknown): RemoteSandboxChatMessageV1[] {
  if (!Array.isArray(input)) return [];

  let out = input
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => {
      const content = trimString(row.content, 200_000, 'chat message');
      const type = trimString(row.type, 40) || 'system';
      const timestamp =
        typeof row.timestamp === 'number' && Number.isFinite(row.timestamp)
          ? row.timestamp
          : Date.now();
      const metadata =
        row.metadata && typeof row.metadata === 'object'
          ? (row.metadata as Record<string, unknown>)
          : undefined;
      return { content, type, timestamp, metadata };
    })
    .filter((row) => row.content.length > 0 && (row.type === 'user' || row.type === 'ai'));

  if (out.length > MAX_REMOTE_CHAT_MESSAGES) {
    out = out.slice(out.length - MAX_REMOTE_CHAT_MESSAGES);
  }

  let json = JSON.stringify(out);
  while (json.length > MAX_REMOTE_CHAT_BYTES && out.length > 1) {
    out = out.slice(-Math.max(1, Math.floor(out.length * 0.85)));
    json = JSON.stringify(out);
  }

  return out;
}

function buildRemoteSandboxSnapshot(input: {
  sandboxId?: string;
  projectId?: unknown;
  projectName?: unknown;
  fileStructure?: unknown;
  structureContent?: unknown;
  sandboxFiles?: unknown;
  chat?: unknown;
  updatedAt?: unknown;
}): RemoteSandboxSnapshotV1 | null {
  const projectId = trimString(input.projectId, 120);
  const fallbackSandboxId = sanitizeSnapshotSandboxId(input.sandboxId || '');
  const stableProjectId = projectId || fallbackSandboxId;
  if (!stableProjectId) return null;

  const fileStructure = trimString(input.fileStructure, 200_000);
  const structureContent = trimString(input.structureContent, 200_000);
  const sandboxFiles = trimSnapshotFiles(input.sandboxFiles);
  const chat = trimSnapshotChat(input.chat);
  const projectName = trimString(input.projectName, 160);

  const updatedAt =
    typeof input.updatedAt === 'number' && Number.isFinite(input.updatedAt)
      ? input.updatedAt
      : Date.now();

  return {
    version: REMOTE_SNAPSHOT_VERSION,
    projectId: stableProjectId,
    projectName,
    fileStructure,
    structureContent,
    sandboxFiles,
    chat,
    updatedAt,
  };
}

function isMeaningfulRemoteSnapshot(snapshot: {
  fileStructure?: string;
  structureContent?: string;
  sandboxFiles?: Record<string, string>;
  chat?: RemoteSandboxChatMessageV1[];
}): boolean {
  const hasFiles = !!snapshot.sandboxFiles && Object.keys(snapshot.sandboxFiles).length > 0;
  if (hasFiles) return true;
  if (Array.isArray(snapshot.chat) && snapshot.chat.length > 0) return true;
  if ((snapshot.fileStructure || '').trim()) return true;
  const structure = (snapshot.structureContent || '').trim();
  return structure.length > 0 && structure !== REMOTE_SNAPSHOT_EMPTY_STRUCTURE;
}
