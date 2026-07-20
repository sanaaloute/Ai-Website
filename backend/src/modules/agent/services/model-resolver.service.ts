import { Injectable, Logger } from '@nestjs/common';
import { env } from '@/config/env';
import { ProviderId, providerModels } from '@/lib/llm-providers';

/**
 * Models approved for use in the AI-Website agent runtime (legacy TokenFree
 * gateway) come from AI_ALLOWED_MODELS (comma-separated); defaults below.
 * Per-provider model allowlists live in `llm-providers.ts`.
 */
const DEFAULT_ALLOWED_MODELS = ['kimi-k2.5', 'qwen-max'];

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
  private readonly logger = new Logger(ModelResolverService.name);
  private readonly warned = new Set<string>();

  /**
   * Return the ordered list of models to try for a given node/agent role.
   * The first model is the role-specific preferred model; subsequent models are fallbacks.
   *
   * When `providerId` is given, the sequence is built from that provider's
   * approved models (see `llm-providers.ts`): heavyweight roles prefer the
   * most capable model, "fast" roles prefer the lightest one.
   */
  resolveSequence(nodeType: string, providerId?: ProviderId): string[] {
    const role = NODE_ROLE_MAP[nodeType] ?? 'reasoning';

    if (providerId) {
      const models = providerModels(providerId);
      // Registry lists models biggest-first; fast roles want the lightest first.
      return role === 'fast' ? [...models].reverse() : models;
    }

    const e = env();
    const allowed = e.aiAllowedModels.length ? e.aiAllowedModels : DEFAULT_ALLOWED_MODELS;
    const allowedSet = new Set(allowed);

    // Role primaries are env-configurable (AI_MODEL_REASONING / _CODE /
    // _REVIEW / _FAST); each must also be in AI_ALLOWED_MODELS to take effect.
    const rolePrimaries: Record<ModelRole, string> = {
      reasoning: e.aiModelReasoning,
      code: e.aiModelCode,
      review: e.aiModelReview,
      fast: e.aiModelFast,
    };

    const sequence = this.dedupe([
      rolePrimaries[role],
      e.aiDefaultModel,
      ...allowed,
    ]).filter((model) => {
      const ok = allowedSet.has(model);
      if (!ok) {
        // Fail LOUDLY: a silently dropped AI_DEFAULT_MODEL/role primary is a
        // config bug that used to be invisible.
        this.warnOnce(
          `Model "${model}" is configured but not in AI_ALLOWED_MODELS (${allowed.join(', ')}) — skipping it.`,
        );
      }
      return ok;
    });

    if (sequence.length === 0) {
      this.warnOnce(
        `No usable models after filtering against AI_ALLOWED_MODELS (${allowed.join(', ')}); falling back to "${allowed[0]}".`,
      );
      return allowed.slice(0, 1);
    }

    return sequence;
  }

  /**
   * Return only the primary model for a node/agent role.
   */
  resolve(nodeType: string, providerId?: ProviderId): string {
    return this.resolveSequence(nodeType, providerId)[0] ?? env().aiDefaultModel;
  }

  /**
   * Generation parameters for a node: temperature by role (env-tunable via
   * AI_TEMP_REASONING/_CODE/_REVIEW/_FAST), optional AI_MAX_TOKENS cap, and a
   * label so [llm-usage] log lines can be attributed per node.
   */
  generationParams(nodeType: string): { temperature: number; maxTokens?: number; label: string } {
    const role = NODE_ROLE_MAP[nodeType] ?? 'reasoning';
    const e = env();
    const temperature: Record<ModelRole, number> = {
      reasoning: e.aiTempReasoning,
      code: e.aiTempCode,
      review: e.aiTempReview,
      fast: e.aiTempFast,
    };
    return { temperature: temperature[role], maxTokens: e.aiMaxTokens, label: nodeType };
  }

  /**
   * Validate that a user-provided model is in the allowed set.
   * This is kept for defense-in-depth even though users cannot override models.
   */
  isAllowedModel(model?: string): boolean {
    const allowed = env().aiAllowedModels;
    return !!model && (allowed.length ? allowed : DEFAULT_ALLOWED_MODELS).includes(model);
  }

  private warnOnce(message: string): void {
    if (this.warned.has(message)) return;
    this.warned.add(message);
    this.logger.warn(message);
  }

  private dedupe(models: string[]): string[] {
    return Array.from(new Set(models.filter(Boolean)));
  }
}
