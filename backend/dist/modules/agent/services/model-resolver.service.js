"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ModelResolverService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelResolverService = void 0;
const common_1 = require("@nestjs/common");
const env_1 = require("../../../config/env");
const llm_providers_1 = require("../../../lib/llm-providers");
const DEFAULT_ALLOWED_MODELS = ['kimi-k2.5', 'qwen-max'];
const NODE_ROLE_MAP = {
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
let ModelResolverService = ModelResolverService_1 = class ModelResolverService {
    constructor() {
        this.logger = new common_1.Logger(ModelResolverService_1.name);
        this.warned = new Set();
    }
    resolveSequence(nodeType, providerId) {
        const role = NODE_ROLE_MAP[nodeType] ?? 'reasoning';
        if (providerId) {
            const models = (0, llm_providers_1.providerModels)(providerId);
            return role === 'fast' ? [...models].reverse() : models;
        }
        const e = (0, env_1.env)();
        const allowed = e.aiAllowedModels.length ? e.aiAllowedModels : DEFAULT_ALLOWED_MODELS;
        const allowedSet = new Set(allowed);
        const rolePrimaries = {
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
                this.warnOnce(`Model "${model}" is configured but not in AI_ALLOWED_MODELS (${allowed.join(', ')}) — skipping it.`);
            }
            return ok;
        });
        if (sequence.length === 0) {
            this.warnOnce(`No usable models after filtering against AI_ALLOWED_MODELS (${allowed.join(', ')}); falling back to "${allowed[0]}".`);
            return allowed.slice(0, 1);
        }
        return sequence;
    }
    resolve(nodeType, providerId) {
        return this.resolveSequence(nodeType, providerId)[0] ?? (0, env_1.env)().aiDefaultModel;
    }
    generationParams(nodeType) {
        const role = NODE_ROLE_MAP[nodeType] ?? 'reasoning';
        const e = (0, env_1.env)();
        const temperature = {
            reasoning: e.aiTempReasoning,
            code: e.aiTempCode,
            review: e.aiTempReview,
            fast: e.aiTempFast,
        };
        return { temperature: temperature[role], maxTokens: e.aiMaxTokens, label: nodeType };
    }
    isAllowedModel(model) {
        const allowed = (0, env_1.env)().aiAllowedModels;
        return !!model && (allowed.length ? allowed : DEFAULT_ALLOWED_MODELS).includes(model);
    }
    warnOnce(message) {
        if (this.warned.has(message))
            return;
        this.warned.add(message);
        this.logger.warn(message);
    }
    dedupe(models) {
        return Array.from(new Set(models.filter(Boolean)));
    }
};
exports.ModelResolverService = ModelResolverService;
exports.ModelResolverService = ModelResolverService = ModelResolverService_1 = __decorate([
    (0, common_1.Injectable)()
], ModelResolverService);
//# sourceMappingURL=model-resolver.service.js.map