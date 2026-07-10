import { Injectable } from '@nestjs/common';
import { env } from '@/config/env';

/**
 * Models approved for use in the LoveCode agent runtime.
 */
const ALLOWED_MODELS = new Set([
  'gpt-5.4',
  'qwen-max',
  'kimi-k2.5',
]);

type ModelRole = 'reasoning' | 'code' | 'review' | 'fast';

const NODE_ROLE_MAP: Record<string, ModelRole> = {
  coordinator: 'reasoning',
  analyzer: 'reasoning',
  designer: 'reasoning',
  component_selector: 'reasoning',
  planner: 'reasoning',
  pre_flight_validator: 'reasoning',
  executor: 'code',
  reviewer: 'review',
  visual_qa: 'review',
  functional_qa: 'review',
  a11y_reviewer: 'review',
  e2e_test_generator: 'code',
  security_reviewer: 'review',
  seo_meta: 'fast',
  debugger: 'code',
  answer_generator: 'reasoning',
  database_initializer: 'code',
  type_checker: 'code',
  chat: 'reasoning',
  analyze_edit_intent: 'reasoning',
  code_component: 'code',
  code_page: 'code',
  design_tokens: 'fast',
  spec_summarize: 'reasoning',
  spec_ui_ux_blueprint: 'reasoning',
  file_plan: 'reasoning',
  schema_evolution: 'reasoning',
};

@Injectable()
export class ModelResolverService {
  /**
   * Return the ordered list of models to try for a given node/agent role.
   * The first model is the role-specific preferred model; subsequent models are fallbacks.
   */
  resolveSequence(nodeType: string): string[] {
    const e = env();
    const role = NODE_ROLE_MAP[nodeType] ?? 'reasoning';

    // Role-specific preferred primaries (restricted to the approved trio):
    // - Reasoning / planning / analysis / chat -> gpt-5.4, then qwen-max, then kimi-k2.5
    // - Coding / debugging -> kimi-k2.5, then gpt-5.4, then qwen-max
    // - Review -> gpt-5.4, then kimi-k2.5, then qwen-max
    // - Fast / light generation -> qwen-max, then gpt-5.4, then kimi-k2.5
    const rolePrimaries: Record<ModelRole, string[]> = {
      reasoning: ['gpt-5.4', 'qwen-max', 'kimi-k2.5'],
      code: ['kimi-k2.5', 'gpt-5.4', 'qwen-max'],
      review: ['gpt-5.4', 'kimi-k2.5', 'qwen-max'],
      fast: ['qwen-max', 'gpt-5.4', 'kimi-k2.5'],
    };

    const approvedFallbacks = [
      'gpt-5.4',
      'kimi-k2.5',
      'qwen-max',
    ];

    const sequence = this.dedupe([
      ...rolePrimaries[role],
      e.aiDefaultModel,
      e.aiReflectionModel,
      ...approvedFallbacks,
    ]).filter((model) => ALLOWED_MODELS.has(model));

    return sequence;
  }

  /**
   * Return only the primary model for a node/agent role.
   */
  resolve(nodeType: string): string {
    return this.resolveSequence(nodeType)[0] ?? env().aiDefaultModel;
  }

  /**
   * Validate that a user-provided model is in the allowed set.
   * This is kept for defense-in-depth even though users cannot override models.
   */
  isAllowedModel(model?: string): boolean {
    return !!model && ALLOWED_MODELS.has(model);
  }

  private dedupe(models: string[]): string[] {
    return Array.from(new Set(models.filter(Boolean)));
  }
}
