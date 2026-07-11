/**
 * Lightweight local project persistence backed by JSON files.
 *
 * The new agent tools import helpers from this module to save files to a
 * local project store. The implementation writes one JSON file per project
 * under the configured store directory (default `.agent_store/` in the backend
 * root, overridable via `AGENT_STORE_DIR`). This survives process restarts
 * (as long as the filesystem persists) and can be replaced with a real DB
 * later without changing the tool code.
 */

import * as fs from 'fs';
import * as path from 'path';

const STORE_DIR = process.env.AGENT_STORE_DIR
  ? path.resolve(process.env.AGENT_STORE_DIR)
  : path.resolve(process.cwd(), '.agent_store');

export interface ProjectRecord {
  id: string;
  name: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredProject {
  project: ProjectRecord;
  files: Record<string, string>;
}

function ensureStoreDir(): void {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function projectPath(projectId: string): string {
  // Sanitize project id for filesystem safety
  const safeId = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(STORE_DIR, `${safeId}.json`);
}

function readProject(projectId: string): StoredProject | undefined {
  try {
    const raw = fs.readFileSync(projectPath(projectId), 'utf-8');
    return JSON.parse(raw) as StoredProject;
  } catch {
    return undefined;
  }
}

function writeProject(projectId: string, data: StoredProject): void {
  ensureStoreDir();
  fs.writeFileSync(projectPath(projectId), JSON.stringify(data, null, 2), 'utf-8');
}

export function upsertProject(id: string, name: string, userId?: string): void {
  const now = new Date().toISOString();
  const existing = readProject(id);
  const project: ProjectRecord = {
    id,
    name,
    userId,
    createdAt: existing?.project.createdAt ?? now,
    updatedAt: now,
  };
  writeProject(id, {
    project,
    files: existing?.files ?? {},
  });
}

export function getProject(id: string): ProjectRecord | undefined {
  return readProject(id)?.project;
}

export function upsertFile(projectId: string, filePath: string, content: string): void {
  const stored = readProject(projectId) ?? {
    project: {
      id: projectId,
      name: projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    files: {},
  };
  stored.files[filePath] = content;
  stored.project.updatedAt = new Date().toISOString();
  writeProject(projectId, stored);
}

export function deleteFile(projectId: string, filePath: string): void {
  const stored = readProject(projectId);
  if (!stored) return;
  delete stored.files[filePath];
  stored.project.updatedAt = new Date().toISOString();
  writeProject(projectId, stored);
}

export function upsertFilesBulk(projectId: string, filesToSave: Array<{ path: string; content: string }>): number {
  const stored = readProject(projectId) ?? {
    project: {
      id: projectId,
      name: projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    files: {},
  };
  let count = 0;
  for (const { path: filePath, content } of filesToSave) {
    stored.files[filePath] = content;
    count++;
  }
  stored.project.updatedAt = new Date().toISOString();
  writeProject(projectId, stored);
  return count;
}
