"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelResolverService = void 0;
const common_1 = require("@nestjs/common");
const env_1 = require("../../../config/env");
const llm_providers_1 = require("../../../lib/llm-providers");
const ALLOWED_MODELS = new Set([
    'qwen-max',
    'kimi-k2.5',
]);
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
let ModelResolverService = class ModelResolverService {
    resolveSequence(nodeType, providerId) {
        const role = NODE_ROLE_MAP[nodeType] ?? 'reasoning';
        if (providerId) {
            const models = (0, llm_providers_1.providerModels)(providerId);
            return role === 'fast' ? [...models].reverse() : models;
        }
        const e = (0, env_1.env)();
        const rolePrimaries = {
            reasoning: ['kimi-k2.5', 'qwen-max'],
            code: ['kimi-k2.5', 'qwen-max'],
            review: ['kimi-k2.5', 'qwen-max'],
            fast: ['qwen-max', 'kimi-k2.5'],
        };
        const approvedFallbacks = [
            'kimi-k2.5',
            'qwen-max',
        ];
        const sequence = this.dedupe([
            ...rolePrimaries[role],
            e.aiDefaultModel,
            ...approvedFallbacks,
        ]).filter((model) => ALLOWED_MODELS.has(model));
        return sequence;
    }
    resolve(nodeType, providerId) {
        return this.resolveSequence(nodeType, providerId)[0] ?? (0, env_1.env)().aiDefaultModel;
    }
    isAllowedModel(model) {
        return !!model && ALLOWED_MODELS.has(model);
    }
    dedupe(models) {
        return Array.from(new Set(models.filter(Boolean)));
    }
};
exports.ModelResolverService = ModelResolverService;
exports.ModelResolverService = ModelResolverService = __decorate([
    (0, common_1.Injectable)()
], ModelResolverService);
//# sourceMappingURL=model-resolver.service.js.map