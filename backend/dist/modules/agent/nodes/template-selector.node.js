"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTemplateCopy = startTemplateCopy;
exports.templateSelectorNode = templateSelectorNode;
const tools_1 = require("../tools");
const e2b_service_1 = require("../../../lib/e2b.service");
const cancellation_1 = require("../../../lib/cancellation");
async function runTemplateCopy(deps, sandboxId, category) {
    let resolvedCategory = category;
    let templateFiles = await deps.templateService.getTemplateFiles(resolvedCategory);
    if (!Object.keys(templateFiles).length) {
        deps.logger.warn(`No template found for category ${resolvedCategory}, using generic`);
        templateFiles = await deps.templateService.getGenericTemplate();
        resolvedCategory = 'generic';
    }
    const framework = await deps.templateService.getTemplateKind(resolvedCategory);
    const templateEntries = Object.entries(templateFiles)
        .filter(([filePath]) => !(0, e2b_service_1.isForbiddenPath)(filePath))
        .map(([filePath, content]) => ({ relativePath: filePath, content }));
    const written = await deps.e2b.writeFilesBatch(sandboxId, templateEntries);
    return {
        category: resolvedCategory,
        framework,
        templateFiles,
        writtenCount: written.length,
    };
}
function startTemplateCopy(deps, sandboxId, category) {
    if (deps.templateCopy)
        return;
    deps.logger.log(`Starting template copy in parallel for category '${category}'`);
    deps.templateCopy = {
        category,
        promise: runTemplateCopy(deps, sandboxId, category),
    };
}
function renderColor(token) {
    return `- **${token.name}**: ${token.value} — ${token.usage}`;
}
function renderDesignAgentsMd(spec) {
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
async function templateSelectorNode(state, deps) {
    let category = state.websiteCategory || 'generic';
    const tools = new tools_1.SandboxProvider(deps.e2b, state.sandboxId, state.projectId);
    try {
        (0, cancellation_1.throwIfCancelled)(deps.signal);
        await tools.ensureAlive(state.userId);
        let templateFiles;
        let framework;
        let loadedCount = 0;
        const failedCount = 0;
        const pendingCopy = deps.templateCopy;
        deps.templateCopy = undefined;
        if (pendingCopy) {
            deps.logger.log(`Awaiting parallel template copy for category '${pendingCopy.category}'`);
        }
        let copyResult;
        try {
            copyResult = pendingCopy
                ? await pendingCopy.promise
                : await runTemplateCopy(deps, state.sandboxId, category);
        }
        catch (e) {
            if (pendingCopy) {
                const message = e instanceof Error ? e.message : String(e);
                deps.logger.warn(`Parallel template copy failed (${message}); retrying inline`);
                copyResult = await runTemplateCopy(deps, state.sandboxId, category);
            }
            else {
                throw e;
            }
        }
        category = copyResult.category;
        templateFiles = copyResult.templateFiles;
        framework = copyResult.framework;
        loadedCount = copyResult.writtenCount;
        for (const [filePath, content] of Object.entries(templateFiles)) {
            await deps.emit((0, tools_1.createFileUpdateEvent)(filePath, content, 'created'));
        }
        const dbSchema = await deps.templateService.getDbSchema(category);
        if (state.designSpec) {
            try {
                const designJson = JSON.stringify(state.designSpec, null, 2);
                const agentsMd = renderDesignAgentsMd(state.designSpec);
                await tools.writeFile('design.json', designJson);
                await tools.writeFile('AGENTS.md', agentsMd);
                await deps.emit((0, tools_1.createFileUpdateEvent)('design.json', designJson, 'created'));
                await deps.emit((0, tools_1.createFileUpdateEvent)('AGENTS.md', agentsMd, 'created'));
            }
            catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                deps.logger.warn(`Failed to write design spec files: ${message}`);
            }
        }
        await deps.emit({ type: 'status', data: { status: 'executing', message: `Configuring ${framework === 'next' ? 'database (Prisma)' : 'PocketBase'} for ${category}...` } });
        let backendReady = false;
        if (framework === 'next') {
            const next = await (0, e2b_service_1.withTransientRetry)('prepareNextSandbox', () => deps.e2b.prepareNextSandbox(state.sandboxId, category), deps.logger);
            backendReady = next.ok;
            if (!next.ok) {
                deps.logger.warn(`Prisma setup failed for category ${category}; continuing without a migrated database`);
            }
        }
        else {
            const pbInfo = await (0, e2b_service_1.withTransientRetry)('reconfigurePocketbaseForCategory', () => deps.e2b.reconfigurePocketbaseForCategory(state.sandboxId, category), deps.logger);
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
            filesWritten: [],
            messages: [{ role: 'assistant', content: `Loaded '${category}' (${framework}) template with ${loadedCount} files${failedCount ? ` (${failedCount} failed)` : ''}${backendReady ? (framework === 'next' ? ' and migrated the Prisma database' : ' and configured PocketBase') : ''}` }],
        };
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const name = e instanceof Error ? e.name : 'UnknownError';
        deps.logger.error(`Template selector failed: [${name}] ${message}${e instanceof Error && e.stack ? `\n${e.stack}` : ''}`);
        return {
            templateId: 'generic',
            templateLoaded: false,
            error: message,
            messages: [{ role: 'assistant', content: `Template error: ${message}` }],
        };
    }
}
//# sourceMappingURL=template-selector.node.js.map