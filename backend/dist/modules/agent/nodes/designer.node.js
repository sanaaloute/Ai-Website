"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.designerNode = designerNode;
const types_1 = require("../../../types");
const tools_1 = require("../tools");
const template_selector_node_1 = require("./template-selector.node");
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
function defaultDesignSpec() {
    return {
        mood: 'Clean, modern, professional SaaS aesthetic',
        colorPalette: {
            primary: { name: 'primary', value: '#0f172a', usage: 'buttons, links, key actions' },
            secondary: { name: 'secondary', value: '#64748b', usage: 'secondary buttons, badges' },
            accent: { name: 'accent', value: '#3b82f6', usage: 'highlights, hover states' },
            background: { name: 'background', value: '#ffffff', usage: 'page background' },
            foreground: { name: 'foreground', value: '#0f172a', usage: 'main text color' },
            muted: { name: 'muted', value: '#f1f5f9', usage: 'subtle backgrounds, disabled text' },
            border: { name: 'border', value: '#e2e8f0', usage: 'dividers, input borders' },
        },
        typography: {
            headingFont: 'Inter, system-ui, sans-serif',
            bodyFont: 'Inter, system-ui, sans-serif',
            monoFont: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            scale: 'base',
        },
        spacing: { base: 4, density: 'normal' },
        radii: '0.5rem',
        shadows: 'soft',
        breakpoints: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
        animationStyle: 'subtle',
        darkMode: false,
        components: { preferred: ['button', 'card', 'input', 'dialog'], avoid: [] },
        rules: [
            'Use the defined color palette for all branded elements.',
            'Use shadcn/ui components where available.',
            'Respect prefers-reduced-motion for animations.',
        ],
    };
}
function validateDesignSpec(parsed) {
    const problems = [];
    if (typeof parsed.mood !== 'string' || !parsed.mood)
        problems.push('mood missing');
    const palette = parsed.colorPalette;
    if (!palette || typeof palette !== 'object') {
        problems.push('colorPalette missing');
    }
    else {
        for (const token of ['primary', 'secondary', 'accent', 'background', 'foreground', 'muted', 'border']) {
            const t = palette[token];
            if (!t || typeof t !== 'object' || typeof t.value !== 'string' || !t.value) {
                problems.push(`colorPalette.${token}.value missing`);
            }
        }
    }
    const typography = parsed.typography;
    if (!typography || typeof typography.headingFont !== 'string' || typeof typography.bodyFont !== 'string') {
        problems.push('typography.headingFont/bodyFont missing');
    }
    const spacing = parsed.spacing;
    if (!spacing || typeof spacing.base !== 'number')
        problems.push('spacing.base missing');
    if (typeof parsed.radii !== 'string')
        problems.push('radii missing');
    if (!Array.isArray(parsed.rules) || parsed.rules.length === 0)
        problems.push('rules missing');
    return problems;
}
async function designerNode(state, deps) {
    const systemPrompt = await deps.promptLoader.load('designer');
    const context = JSON.stringify({
        userRequest: state.prompt,
        websiteCategory: state.websiteCategory,
        websiteType: state.websiteType,
        scope: state.scope,
        relevantFiles: state.relevantFiles,
        needsIntegration: state.needsIntegration,
    });
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: (0, types_1.promptToString)((0, types_1.buildPromptContent)(`Analyzer output: ${context}`, state.prompt)) },
    ];
    try {
        if (state.workflow === 'new_app' && state.sandboxId) {
            (0, template_selector_node_1.startTemplateCopy)(deps, state.sandboxId, state.websiteCategory || 'generic');
        }
        await deps.emit({
            type: 'status',
            data: { status: 'analyzing', message: 'Creating design system spec...' },
        });
        const { finalContent } = await (0, tools_1.runToolLoop)(deps, state, (ctx, docsTools) => (0, tools_1.buildPlanningToolSet)(ctx, docsTools), messages, 'designer', state.aiCredentials, 10);
        const parsed = extractJson(finalContent);
        if (!parsed) {
            throw new Error('Designer returned invalid JSON; falling back to default spec.');
        }
        const problems = validateDesignSpec(parsed);
        if (problems.length) {
            throw new Error(`Designer spec failed validation (${problems.join('; ')}); falling back to default spec.`);
        }
        const spec = parsed;
        return {
            designSpec: spec,
            messages: [{ role: 'assistant', content: `Design spec created: ${spec.mood}` }],
        };
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        deps.logger.error(`Designer node failed: ${message}`);
        return {
            designSpec: defaultDesignSpec(),
            messages: [{ role: 'assistant', content: `Designer error: ${message}. Using fallback design spec.` }],
        };
    }
}
//# sourceMappingURL=designer.node.js.map