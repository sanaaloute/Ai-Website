import { AgentState, DesignSpec } from '../state';
import { GraphDependencies } from '../graph';
import { SandboxProvider, createFileUpdateEvent } from '../tools';
import { withTransientRetry, isForbiddenPath } from '@/lib/e2b.service';
import { throwIfCancelled } from '@/lib/cancellation';

export interface TemplateCopyResult {
  category: string;
  framework: 'next' | 'vite';
  templateFiles: Record<string, string>;
  writtenCount: number;
}

/**
 * Run the template file copy (load files + batched sandbox upload). Shared by
 * the parallel kick-off (started during the designer node) and the sequential
 * fallback inside the template selector node.
 */
async function runTemplateCopy(
  deps: GraphDependencies,
  sandboxId: string,
  category: string,
): Promise<TemplateCopyResult> {
  let resolvedCategory = category;
  let templateFiles = await deps.templateService.getTemplateFiles(resolvedCategory);
  if (!Object.keys(templateFiles).length) {
    deps.logger.warn(`No template found for category ${resolvedCategory}, using generic`);
    templateFiles = await deps.templateService.getGenericTemplate();
    resolvedCategory = 'generic';
  }

  const framework = await deps.templateService.getTemplateKind(resolvedCategory);

  const templateEntries = Object.entries(templateFiles)
    .filter(([filePath]) => !isForbiddenPath(filePath))
    .map(([filePath, content]) => ({ relativePath: filePath, content }));
  const written = await deps.e2b.writeFilesBatch(sandboxId, templateEntries);
  return {
    category: resolvedCategory,
    framework,
    templateFiles,
    writtenCount: written.length,
  };
}

/**
 * Kick off the template copy in the background so it runs in parallel with
 * the designer/component-selector nodes. The template selector node awaits
 * (and consumes) the promise; if it never ran (non new_app flows) or failed,
 * the node falls back to copying the template itself.
 */
export function startTemplateCopy(
  deps: GraphDependencies,
  sandboxId: string,
  category: string,
): void {
  if (deps.templateCopy) return;
  deps.logger.log(`Starting template copy in parallel for category '${category}'`);
  deps.templateCopy = {
    category,
    promise: runTemplateCopy(deps, sandboxId, category),
  };
}

function renderColor(token: { name: string; value: string; usage: string }): string {
  return `- **${token.name}**: ${token.value} — ${token.usage}`;
}

function renderDesignAgentsMd(spec: DesignSpec): string {
  const colors = [
    renderColor(spec.colorPalette.primary),
    renderColor(spec.colorPalette.secondary),
    renderColor(spec.colorPalette.accent),
    renderColor(spec.colorPalette.background),
    renderColor(spec.colorPalette.foreground),
    renderColor(spec.colorPalette.muted),
    renderColor(spec.colorPalette.border),
  ];
  if (spec.colorPalette.dark) {
    colors.push('### Dark mode');
    for (const token of Object.values(spec.colorPalette.dark)) {
      colors.push(renderColor(token));
    }
  }

  return `# Design System

## Brand
${spec.brandName ? `- **Brand**: ${spec.brandName}` : ''}
- **Mood**: ${spec.mood}
- **Dark mode**: ${spec.darkMode ? 'enabled' : 'disabled'}

## Colors
${colors.join('\n')}

## Typography
- **Heading font**: ${spec.typography.headingFont}
- **Body font**: ${spec.typography.bodyFont}
- **Scale**: ${spec.typography.scale}

## Spacing & shape
- **Base spacing**: ${spec.spacing.base}px
- **Density**: ${spec.spacing.density}
- **Border radius**: ${spec.radii}
- **Shadows**: ${spec.shadows}

## Components
- **Preferred**: ${spec.components.preferred.join(', ') || 'none'}
- **Avoid**: ${spec.components.avoid.join(', ') || 'none'}

## Rules
${spec.rules.map((r) => `- ${r}`).join('\n')}
`;
}

export async function templateSelectorNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>> {
  let category = state.websiteCategory || 'generic';
  const tools = new SandboxProvider(deps.e2b, state.sandboxId, state.projectId);

  try {
    throwIfCancelled(deps.signal);
    await tools.ensureAlive(state.userId);

    // Detect the template framework (next | vite) so downstream setup branches
    // to the right runtime (Next.js + Prisma vs Vite + PocketBase).
    //
    // The template copy may have been started in parallel during the designer
    // node (see startTemplateCopy). If so, await its result; otherwise copy
    // the template now in a single batched upload (one mkdir + one multipart
    // write, retried on transient network errors). The old per-file loop
    // needed 2 envd round-trips per file and could take 10+ minutes — or fail
    // outright — on slow networks.
    // We intentionally do NOT add these baseline files to filesWritten: they
    // are scaffold, not agent-generated changes, and including them causes the
    // reviewer to waste context reading the entire template.
    let templateFiles: Record<string, string>;
    let framework: 'next' | 'vite';
    let loadedCount = 0;
    const failedCount = 0;

    const pendingCopy = deps.templateCopy;
    deps.templateCopy = undefined;
    if (pendingCopy) {
      deps.logger.log(`Awaiting parallel template copy for category '${pendingCopy.category}'`);
    }
    let copyResult: TemplateCopyResult;
    try {
      copyResult = pendingCopy
        ? await pendingCopy.promise
        : await runTemplateCopy(deps, state.sandboxId, category);
    } catch (e) {
      // If the parallel copy failed, retry the copy inline before giving up.
      if (pendingCopy) {
        const message = e instanceof Error ? e.message : String(e);
        deps.logger.warn(`Parallel template copy failed (${message}); retrying inline`);
        copyResult = await runTemplateCopy(deps, state.sandboxId, category);
      } else {
        throw e;
      }
    }

    category = copyResult.category;
    templateFiles = copyResult.templateFiles;
    framework = copyResult.framework;
    loadedCount = copyResult.writtenCount;
    // Stream lightweight file_update events so the frontend knows the
    // template files exist and can fetch their content lazily.
    for (const [filePath, content] of Object.entries(templateFiles)) {
      await deps.emit(createFileUpdateEvent(filePath, content, 'created'));
    }

    const dbSchema = await deps.templateService.getDbSchema(category);

    // Persist the design spec as a machine-readable contract and a concise
    // AGENTS.md summary so every downstream node (and future agents) reads
    // from the same source of truth.
    if (state.designSpec) {
      try {
        const designJson = JSON.stringify(state.designSpec, null, 2);
        const agentsMd = renderDesignAgentsMd(state.designSpec);
        await tools.writeFile('design.json', designJson);
        await tools.writeFile('AGENTS.md', agentsMd);
        await deps.emit(createFileUpdateEvent('design.json', designJson, 'created'));
        await deps.emit(createFileUpdateEvent('AGENTS.md', agentsMd, 'created'));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        deps.logger.warn(`Failed to write design spec files: ${message}`);
      }
    }

    // Configure the sandbox backend to match the selected category/framework.
    await deps.emit({ type: 'status', data: { status: 'executing', message: `Configuring ${framework === 'next' ? 'database (Prisma)' : 'PocketBase'} for ${category}...` } });
    let backendReady = false;
    if (framework === 'next') {
      const next = await withTransientRetry(
        'prepareNextSandbox',
        () => deps.e2b.prepareNextSandbox(state.sandboxId, category),
        deps.logger,
      );
      backendReady = next.ok;
      if (!next.ok) {
        deps.logger.warn(`Prisma setup failed for category ${category}; continuing without a migrated database`);
      }
    } else {
      const pbInfo = await withTransientRetry(
        'reconfigurePocketbaseForCategory',
        () => deps.e2b.reconfigurePocketbaseForCategory(state.sandboxId, category),
        deps.logger,
      );
      backendReady = !!pbInfo;
      if (!pbInfo) {
        deps.logger.warn(`PocketBase reconfiguration failed for category ${category}; continuing without live backend`);
      }
    }

    const currentSandboxId = await tools.ensureAlive(state.userId);

    return {
      sandboxId: currentSandboxId,
      templateId: category,
      framework,
      templateLoaded: true,
      packagesToInstall: [],
      packagesInstalled: [],
      dbSchemaTemplate: dbSchema,
      // Do not return template files as filesWritten — they are not agent changes.
      filesWritten: [],
      messages: [{ role: 'assistant', content: `Loaded '${category}' (${framework}) template with ${loadedCount} files${failedCount ? ` (${failedCount} failed)` : ''}${backendReady ? (framework === 'next' ? ' and migrated the Prisma database' : ' and configured PocketBase') : ''}` }],
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const name = e instanceof Error ? e.name : 'UnknownError';
    deps.logger.error(
      `Template selector failed: [${name}] ${message}${e instanceof Error && e.stack ? `\n${e.stack}` : ''}`,
    );
    return {
      templateId: 'generic',
      templateLoaded: false,
      error: message,
      messages: [{ role: 'assistant', content: `Template error: ${message}` }],
    };
  }
}
