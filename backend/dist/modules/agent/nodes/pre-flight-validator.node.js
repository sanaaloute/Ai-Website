"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePlan = validatePlan;
exports.preFlightValidatorNode = preFlightValidatorNode;
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
const FORBIDDEN_PATH_PATTERNS = [
    /\.\./,
    /^\//,
    /^(~|[A-Za-z]:\\)/,
    /node_modules/,
    /\.env/,
    /\.git/,
];
const FORBIDDEN_STEP_PATTERNS = [
    /\brm\s+-rf\b/i,
    /\bsudo\b/i,
    /\/etc\/|\/usr\/|\/var\/|\/bin\/|\/sbin\//i,
    /\.\.\/\.\./,
    /chmod\s+777/i,
    /curl\s+.*\|\s*sh/i,
];
function validatePlan(steps, newFiles) {
    const errors = [];
    const warnings = [];
    if (steps.length === 0 && newFiles.length === 0) {
        warnings.push('Plan contains no steps and no new files.');
    }
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (typeof step !== 'string' || step.trim().length === 0) {
            errors.push(`Plan step ${i + 1} is empty or not a string.`);
            continue;
        }
        for (const pattern of FORBIDDEN_STEP_PATTERNS) {
            if (pattern.test(step)) {
                errors.push(`Plan step ${i + 1} contains a forbidden pattern: ${step}`);
                break;
            }
        }
    }
    const allowedRootFiles = new Set([
        'package.json',
        'tsconfig.json',
        'tsconfig.app.json',
        'tsconfig.node.json',
        'vite.config.ts',
        'tailwind.config.ts',
        'postcss.config.js',
        'index.html',
        'manifest.json',
        'components.json',
        'design.json',
        'AGENTS.md',
    ]);
    for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        if (typeof file !== 'string' || file.trim().length === 0) {
            errors.push(`newFiles entry ${i + 1} is empty or not a string.`);
            continue;
        }
        const normalized = file.replace(/\\/g, '/');
        if (FORBIDDEN_PATH_PATTERNS.some((p) => p.test(normalized))) {
            errors.push(`newFiles entry ${i + 1} points to a forbidden path: ${file}`);
            continue;
        }
        const isInSrc = normalized.startsWith('src/');
        const isInPublic = normalized.startsWith('public/');
        const isRootFile = !normalized.includes('/') && allowedRootFiles.has(normalized);
        if (!isInSrc && !isInPublic && !isRootFile) {
            warnings.push(`newFiles entry ${i + 1} is outside src/ or public/: ${file}`);
        }
    }
    return { errors, warnings };
}
async function preFlightValidatorNode(state, deps) {
    const userApiKey = state.userApiKey;
    const deterministic = validatePlan(state.planSteps ?? [], state.planNewFiles ?? []);
    if (!state.planSteps?.length) {
        return {
            planValid: deterministic.errors.length === 0,
            planErrors: deterministic.errors,
            planWarnings: deterministic.warnings,
            messages: [{ role: 'assistant', content: 'No plan to validate' }],
        };
    }
    const systemPrompt = await deps.promptLoader.load('pre-flight-validator');
    const context = JSON.stringify({
        analyzer: {
            intent: state.intent,
            scope: state.scope,
            relevantFiles: state.relevantFiles ?? [],
        },
        planner: {
            summary: state.planSummary,
            steps: state.planSteps,
            design: state.planDesign,
            newFiles: state.planNewFiles,
        },
    });
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context },
    ];
    try {
        const resultText = await deps.aiGateway.chatCompletionsStream(messages, deps.modelResolver.resolveSequence('pre_flight_validator'), userApiKey, async (token) => {
            await deps.emit({ type: 'token', data: { content: token } });
        });
        const result = extractJson(resultText) || {};
        const correctedSteps = Array.isArray(result.corrected_steps)
            ? result.corrected_steps
            : state.planSteps;
        const correctedDesign = result.corrected_design ?? state.planDesign ?? '';
        const correctedNewFiles = Array.isArray(result.corrected_newFiles)
            ? result.corrected_newFiles
            : state.planNewFiles ?? [];
        let todos = state.todos ?? [];
        if (JSON.stringify(correctedSteps) !== JSON.stringify(state.planSteps)) {
            todos = correctedSteps.map((step, i) => ({ id: String(i + 1), content: step, status: 'pending' }));
        }
        const errors = [
            ...deterministic.errors,
            ...(Array.isArray(result.errors) ? result.errors : []),
        ];
        const warnings = [
            ...deterministic.warnings,
            ...(Array.isArray(result.warnings) ? result.warnings : []),
        ];
        const valid = errors.length === 0;
        return {
            planValid: valid,
            planErrors: errors,
            planWarnings: warnings,
            planSteps: correctedSteps,
            planDesign: correctedDesign,
            planNewFiles: correctedNewFiles,
            todos,
            messages: [{ role: 'assistant', content: `Validation: ${valid ? 'passed' : 'failed'} (${errors.length} errors, ${warnings.length} warnings)` }],
        };
    }
    catch (e) {
        deps.logger.error(`Pre-flight validator failed: ${e instanceof Error ? e.message : String(e)}`);
        return {
            planValid: deterministic.errors.length === 0,
            planErrors: [
                ...deterministic.errors,
                `Validation system error: ${e instanceof Error ? e.message : String(e)}`,
            ],
            planWarnings: [
                ...deterministic.warnings,
                'Please retry or contact support if the issue persists.',
            ],
            messages: [{ role: 'assistant', content: `Validation error: ${e instanceof Error ? e.message : String(e)}` }],
        };
    }
}
//# sourceMappingURL=pre-flight-validator.node.js.map