"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.componentSelectorNode = componentSelectorNode;
const types_1 = require("../../../types");
const tools_1 = require("../tools");
function extractJson(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            }
            catch {
                return null;
            }
        }
        return null;
    }
}
function defaultComponents(category) {
    const base = ['button', 'card', 'input', 'label', 'dialog', 'form'];
    switch (category) {
        case 'ecommerce':
            return [...base, 'badge', 'table', 'select', 'dropdown-menu', 'tabs', 'sonner'];
        case 'blog':
            return [...base, 'badge', 'separator', 'tabs'];
        case 'portfolio':
            return [...base, 'badge', 'separator', 'avatar'];
        case 'restaurant':
        case 'real_estate':
        case 'travel':
            return [...base, 'badge', 'select', 'tabs', 'separator'];
        default:
            return [...base, 'badge', 'table', 'select', 'dropdown-menu', 'tabs'];
    }
}
async function componentSelectorNode(state, deps) {
    const systemPrompt = await deps.promptLoader.load('component-selector');
    const context = JSON.stringify({
        designSpec: state.designSpec,
        scope: state.scope,
        websiteCategory: state.websiteCategory,
        websiteType: state.websiteType,
        needsIntegration: state.needsIntegration,
        userRequest: state.prompt,
    });
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: (0, types_1.promptToString)((0, types_1.buildPromptContent)(`Design spec and request: ${context}`, state.prompt)) },
    ];
    try {
        await deps.emit({
            type: 'status',
            data: { status: 'analyzing', message: 'Selecting shadcn/ui components...' },
        });
        const { finalContent } = await (0, tools_1.runToolLoop)(deps, state, (ctx, docsTools) => (0, tools_1.buildPlanningToolSet)(ctx, docsTools), messages, 'component_selector', state.userApiKey, 8);
        const parsed = extractJson(finalContent);
        const components = Array.isArray(parsed?.componentsToInstall)
            ? parsed?.componentsToInstall
            : [];
        const finalComponents = components.length ? components : defaultComponents(state.websiteCategory);
        return {
            componentsToInstall: finalComponents,
            messages: [{ role: 'assistant', content: `Selected ${finalComponents.length} shadcn components` }],
        };
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        deps.logger.error(`Component selector failed: ${message}`);
        return {
            componentsToInstall: defaultComponents(state.websiteCategory),
            messages: [{ role: 'assistant', content: `Component selector error: ${message}. Using defaults.` }],
        };
    }
}
//# sourceMappingURL=component-selector.node.js.map