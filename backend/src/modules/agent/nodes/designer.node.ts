import { AgentState, DesignSpec } from '../state';
import { GraphDependencies } from '../graph';
import { promptToString, buildPromptContent } from '@/types';
import { buildPlanningToolSet, runToolLoop, ToolLoopMessage } from '../tools';

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
