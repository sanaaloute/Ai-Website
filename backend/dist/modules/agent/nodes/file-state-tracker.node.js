"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileStateTrackerNode = fileStateTrackerNode;
const tools_1 = require("../tools");
const MANIFEST_PATH = '.agent_state/file_manifest.json';
const PROTECTED_PATHS = new Set([
    'package.json', 'vite.config.ts', 'tsconfig.json',
    'tsconfig.app.json', 'tsconfig.node.json',
    'postcss.config.js', 'tailwind.config.ts', 'index.html',
]);
async function fileStateTrackerNode(state, deps) {
    const tools = new tools_1.SandboxProvider(deps.e2b, state.sandboxId, state.projectId);
    const filesWritten = state.filesWritten ?? [];
    if (!filesWritten.length) {
        return {
            messages: [{ role: 'assistant', content: 'No file changes to track' }],
        };
    }
    const manifest = {
        session_id: '',
        files: {},
        protected_paths: Array.from(PROTECTED_PATHS),
    };
    try {
        const existing = await tools.readFile(MANIFEST_PATH);
        const parsed = JSON.parse(existing);
        manifest.session_id = parsed.session_id || '';
        manifest.files = parsed.files || {};
    }
    catch {
    }
    if (!manifest.session_id) {
        manifest.session_id = new Date().toISOString();
    }
    const files = manifest.files;
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
    }
    catch (e) {
        deps.logger.warn(`Could not write manifest: ${e instanceof Error ? e.message : String(e)}`);
    }
    const changedCount = Object.keys(files).length;
    return {
        messages: [{ role: 'assistant', content: `Tracked ${changedCount} file changes` }],
    };
}
//# sourceMappingURL=file-state-tracker.node.js.map