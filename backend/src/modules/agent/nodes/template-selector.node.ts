import { AgentState, DesignSpec } from '../state';
import { GraphDependencies } from '../graph';
import { SandboxProvider, createFileUpdateEvent } from '../tools';

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
    await tools.ensureAlive(state.userId);

    let templateFiles = await deps.templateService.getTemplateFiles(category);
    if (!Object.keys(templateFiles).length) {
      deps.logger.warn(`No template found for category ${category}, using generic`);
      templateFiles = await deps.templateService.getGenericTemplate();
      category = 'generic';
    }

    // Detect the template framework (next | vite) so downstream setup branches
    // to the right runtime (Next.js + Prisma vs Vite + PocketBase).
    const framework = await deps.templateService.getTemplateKind(category);

    // Copy the template into the sandbox. We intentionally do NOT add these
    // baseline files to filesWritten: they are scaffold, not agent-generated
    // changes, and including them causes the reviewer to waste context reading
    // the entire template instead of the actual code the agent produced.
    let loadedCount = 0;
    let failedCount = 0;
    for (const [filePath, content] of Object.entries(templateFiles)) {
      try {
        await tools.writeFile(filePath, content);
        loadedCount++;
        // Stream a lightweight file_update so the frontend knows the template file
        // exists and can fetch its content lazily.
        await deps.emit(createFileUpdateEvent(filePath, content, 'created'));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        deps.logger.warn(`Failed to copy template file ${filePath}: ${message}`);
        failedCount++;
      }
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
      const next = await deps.e2b.prepareNextSandbox(state.sandboxId, category);
      backendReady = next.ok;
      if (!next.ok) {
        deps.logger.warn(`Prisma setup failed for category ${category}; continuing without a migrated database`);
      }
    } else {
      const pbInfo = await deps.e2b.reconfigurePocketbaseForCategory(state.sandboxId, category);
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
    deps.logger.error(`Template selector failed: ${e instanceof Error ? e.message : String(e)}`);
    return {
      templateId: 'generic',
      templateLoaded: false,
      error: e instanceof Error ? e.message : String(e),
      messages: [{ role: 'assistant', content: `Template error: ${e instanceof Error ? e.message : String(e)}` }],
    };
  }
}
