import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
import { SandboxProvider } from '../tools';

const MANIFEST_PATH = '.agent_state/file_manifest.json';
const PROTECTED_PATHS = new Set([
  'package.json', 'vite.config.ts', 'tsconfig.json',
  'tsconfig.app.json', 'tsconfig.node.json',
  'postcss.config.js', 'tailwind.config.ts', 'index.html',
]);

export async function fileStateTrackerNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>> {
  const tools = new SandboxProvider(deps.e2b, state.sandboxId, state.projectId);
  const filesWritten = state.filesWritten ?? [];

  if (!filesWritten.length) {
    return {
      messages: [{ role: 'assistant', content: 'No file changes to track' }],
    };
  }

  const manifest: Record<string, unknown> = {
    session_id: '',
    files: {} as Record<string, unknown>,
    protected_paths: Array.from(PROTECTED_PATHS),
  };

  try {
    const existing = await tools.readFile(MANIFEST_PATH);
    const parsed = JSON.parse(existing);
    manifest.session_id = parsed.session_id || '';
    manifest.files = parsed.files || {};
  } catch {
    // Manifest doesn't exist yet
  }

  if (!manifest.session_id) {
    manifest.session_id = new Date().toISOString();
  }

  const files = manifest.files as Record<string, { status: string; last_modified: string }>;
  for (const fw of filesWritten) {
    const filePath = fw.path;
    const status = fw.status || 'modified';
    if (PROTECTED_PATHS.has(filePath)) {
      deps.logger.warn(`Attempted modification of protected file ${filePath}`);
    }
    files[filePath] = { status, last_modified: new Date().toISOString() };
  }

  try {
    await tools.writeSystemFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  } catch (e) {
    deps.logger.warn(`Could not write manifest: ${e instanceof Error ? e.message : String(e)}`);
  }

  const changedCount = Object.keys(files).length;
  return {
    messages: [{ role: 'assistant', content: `Tracked ${changedCount} file changes` }],
  };
}
