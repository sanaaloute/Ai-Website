import { AgentState } from '../state';
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

export async function plannerNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>> {
  const prompt = state.prompt;
  const promptString = promptToString(prompt);
  const intent = state.intent || 'edit';
  const scope = state.scope || promptString;
  const relevantFiles = state.relevantFiles ?? [];
  const userApiKey = state.userApiKey;

  const systemPrompt = await deps.promptLoader.load('planner');

  const previousValidation =
    state.planErrors?.length || state.planWarnings?.length
      ? {
          previousPlan: {
            summary: state.planSummary,
            steps: state.planSteps,
            design: state.planDesign,
            newFiles: state.planNewFiles,
          },
          errors: state.planErrors,
          warnings: state.planWarnings,
        }
      : undefined;

  const context = JSON.stringify({
    intent,
    scope,
    relevantFiles,
    websiteCategory: state.websiteCategory,
    websiteType: state.websiteType,
    needsIntegration: state.needsIntegration,
    userRequest: prompt,
    designSpec: state.designSpec,
    componentsToInstall: state.componentsToInstall,
    databaseStatus: state.databaseStatus,
    ...(previousValidation && { previousValidation }),
  });

  const messages: ToolLoopMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: promptToString(buildPromptContent(`Analyzer output: ${context}`, prompt)) },
  ];

  try {
    const loopResult = await runToolLoop(
      deps,
      state,
      (ctx, docs) => buildPlanningToolSet(ctx, docs),
      messages,
      'planner',
      userApiKey,
      10,
    );

    const resultText = loopResult.finalContent;
    let result = extractJson(resultText) || {};
    let steps: string[] = Array.isArray(result.steps) ? (result.steps as string[]) : [];

    if (!steps.length) {
      deps.logger.warn('Planner returned empty steps; using fallback plan');
      steps = [`Implement: ${promptString}`];
      result = { ...result, summary: result.summary || `Implement ${promptString}`, design: result.design || '', newFiles: result.newFiles || [] };
    }

    const todos = steps.map((step, i) => ({ id: String(i + 1), content: step, status: 'pending' as const }));

    return {
      planSummary: (result.summary as string) || '',
      planSteps: steps,
      planDesign: (result.design as string) || '',
      planNewFiles: Array.isArray(result.newFiles) ? (result.newFiles as string[]) : [],
      todos,
      packagesToInstall: state.packagesToInstall ?? [],
      messages: [{ role: 'assistant', content: `Planned ${steps.length} steps` }],
    };
  } catch (e) {
    deps.logger.error(`Planner node failed: ${e instanceof Error ? e.message : String(e)}`);
    return {
      planSummary: 'Implement requested changes',
      planSteps: [`Implement: ${promptString}`],
      planDesign: '',
      planNewFiles: [],
      todos: [{ id: '1', content: promptString, status: 'pending' }],
      error: e instanceof Error ? e.message : String(e),
      messages: [{ role: 'assistant', content: `Planning error: ${e instanceof Error ? e.message : String(e)}` }],
    };
  }
}
