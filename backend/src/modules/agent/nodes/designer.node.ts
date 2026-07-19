import { AgentState, DesignSpec } from '../state';
import { GraphDependencies } from '../graph';
import { promptToString, buildPromptContent } from '@/types';
import { buildPlanningToolSet, runToolLoop, ToolLoopMessage } from '../tools';
import { startTemplateCopy } from './template-selector.node';

function extractJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function defaultDesignSpec(): DesignSpec {
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

/**
 * Validate the shape the downstream consumers (template selector, executor)
 * rely on. The prompt asks for this schema, but the model is free to return
 * partial JSON — a blind cast would crash renderDesignAgentsMd or feed a
 * broken spec to the executor. Returns a list of problems (empty = valid).
 */
function validateDesignSpec(parsed: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (typeof parsed.mood !== 'string' || !parsed.mood) problems.push('mood missing');

  const palette = parsed.colorPalette as Record<string, unknown> | undefined;
  if (!palette || typeof palette !== 'object') {
    problems.push('colorPalette missing');
  } else {
    for (const token of ['primary', 'secondary', 'accent', 'background', 'foreground', 'muted', 'border']) {
      const t = palette[token] as { value?: unknown } | undefined;
      if (!t || typeof t !== 'object' || typeof t.value !== 'string' || !t.value) {
        problems.push(`colorPalette.${token}.value missing`);
      }
    }
  }

  const typography = parsed.typography as Record<string, unknown> | undefined;
  if (!typography || typeof typography.headingFont !== 'string' || typeof typography.bodyFont !== 'string') {
    problems.push('typography.headingFont/bodyFont missing');
  }

  const spacing = parsed.spacing as Record<string, unknown> | undefined;
  if (!spacing || typeof spacing.base !== 'number') problems.push('spacing.base missing');

  if (typeof parsed.radii !== 'string') problems.push('radii missing');
  if (!Array.isArray(parsed.rules) || parsed.rules.length === 0) problems.push('rules missing');
  return problems;
}

export async function designerNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>> {
  const systemPrompt = await deps.promptLoader.load('designer');

  const context = JSON.stringify({
    userRequest: state.prompt,
    websiteCategory: state.websiteCategory,
    websiteType: state.websiteType,
    scope: state.scope,
    relevantFiles: state.relevantFiles,
    needsIntegration: state.needsIntegration,
  });

  const messages: ToolLoopMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: promptToString(buildPromptContent(`Analyzer output: ${context}`, state.prompt)) },
  ];

  try {
    // Start copying the selected template into the sandbox in parallel — the
    // template selector node will await this instead of copying sequentially
    // after the design phase finishes.
    if (state.workflow === 'new_app' && state.sandboxId) {
      startTemplateCopy(deps, state.sandboxId, state.websiteCategory || 'generic');
    }

    await deps.emit({
      type: 'status',
      data: { status: 'analyzing', message: 'Creating design system spec...' },
    });

    const { finalContent } = await runToolLoop(
      deps,
      state,
      (ctx, docsTools) => buildPlanningToolSet(ctx, docsTools),
      messages,
      'designer',
      state.aiCredentials,
      10,
    );

    const parsed = extractJson(finalContent);
    if (!parsed) {
      throw new Error('Designer returned invalid JSON; falling back to default spec.');
    }

    const problems = validateDesignSpec(parsed);
    if (problems.length) {
      throw new Error(`Designer spec failed validation (${problems.join('; ')}); falling back to default spec.`);
    }

    const spec = parsed as unknown as DesignSpec;

    return {
      designSpec: spec,
      messages: [{ role: 'assistant', content: `Design spec created: ${spec.mood}` }],
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    deps.logger.error(`Designer node failed: ${message}`);
    return {
      designSpec: defaultDesignSpec(),
      messages: [{ role: 'assistant', content: `Designer error: ${message}. Using fallback design spec.` }],
    };
  }
}
