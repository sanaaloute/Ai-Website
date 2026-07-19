"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAgentGraph = buildAgentGraph;
const langgraph_1 = require("@langchain/langgraph");
const state_1 = require("./state");
const coordinator_node_1 = require("./nodes/coordinator.node");
const analyzer_node_1 = require("./nodes/analyzer.node");
const template_selector_node_1 = require("./nodes/template-selector.node");
const planner_node_1 = require("./nodes/planner.node");
const pre_flight_validator_node_1 = require("./nodes/pre-flight-validator.node");
const executor_node_1 = require("./nodes/executor.node");
const file_state_tracker_node_1 = require("./nodes/file-state-tracker.node");
const reviewer_node_1 = require("./nodes/reviewer.node");
const debugger_node_1 = require("./nodes/debugger.node");
const answer_generator_node_1 = require("./nodes/answer-generator.node");
const finalize_node_1 = require("./nodes/finalize.node");
const increment_retry_node_1 = require("./nodes/increment-retry.node");
const type_checker_node_1 = require("./nodes/type-checker.node");
const database_initializer_node_1 = require("./nodes/database-initializer.node");
const designer_node_1 = require("./nodes/designer.node");
const component_selector_node_1 = require("./nodes/component-selector.node");
const verification_node_1 = require("./nodes/verification.node");
const cancellation_1 = require("../../lib/cancellation");
const env_1 = require("../../config/env");
function maxNodeAttempts() {
    return (0, env_1.env)().agentMaxNodeAttempts;
}
function wrapNode(name, fn) {
    return async (state, config) => {
        const deps = config?.configurable?.deps;
        if (!deps) {
            throw new Error(`Missing graph dependencies for node "${name}"`);
        }
        const signal = deps.signal ?? config?.signal;
        (0, cancellation_1.throwIfCancelled)(signal);
        deps.logger.debug(`Running node: ${name}`);
        const nodeDeps = {
            ...deps,
            emit: (event) => deps.emit({
                ...event,
                data: { ...(event.data ?? {}), node: name },
            }),
        };
        const maxAttempts = maxNodeAttempts();
        let lastError;
        let failedResult = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            (0, cancellation_1.throwIfCancelled)(signal);
            try {
                const result = await fn(state, nodeDeps);
                if (result && typeof result.error === 'string' && result.error) {
                    failedResult = result;
                    lastError = new Error(result.error);
                    if (attempt < maxAttempts) {
                        await nodeDeps.emit({
                            type: 'status',
                            data: {
                                status: 'retrying',
                                message: `${name} failed, retrying (${attempt + 1}/${maxAttempts})...`,
                            },
                        });
                        deps.logger.warn(`Node ${name} reported failure (attempt ${attempt}/${maxAttempts}): ${result.error}`);
                        await (0, cancellation_1.sleepWithSignal)(1000 * attempt, signal);
                        continue;
                    }
                }
                return result;
            }
            catch (e) {
                if ((0, cancellation_1.isCancellation)(e))
                    throw e;
                lastError = e;
                if (attempt < maxAttempts) {
                    const message = e instanceof Error ? e.message : String(e);
                    await nodeDeps.emit({
                        type: 'status',
                        data: {
                            status: 'retrying',
                            message: `${name} failed, retrying (${attempt + 1}/${maxAttempts})...`,
                        },
                    });
                    deps.logger.warn(`Node ${name} threw (attempt ${attempt}/${maxAttempts}): ${message}`);
                    await (0, cancellation_1.sleepWithSignal)(1000 * attempt, signal);
                    continue;
                }
            }
        }
        if (failedResult)
            return failedResult;
        throw lastError instanceof Error ? lastError : new Error(String(lastError));
    };
}
function routeAfterAnalyzer(state) {
    if (state.workflow === 'review_fix')
        return 'executor';
    if (state.needsClarification)
        return 'finalize';
    if (state.workflow === 'chat')
        return 'answer_generator';
    if (state.workflow === 'new_app')
        return 'designer';
    if (state.workflow === 'debug')
        return 'debugger';
    if (state.needsIntegration)
        return 'database_initializer';
    return 'executor';
}
function routeAfterDesigner(_state) {
    return 'component_selector';
}
function routeAfterComponentSelector(_state) {
    return 'template_selector';
}
function routeAfterPlanner(_state) {
    return 'pre_flight_validator';
}
function routeAfterPreFlightValidator(_state) {
    return 'executor';
}
function routeAfterDebugger(_state) {
    return 'reviewer';
}
function routeAfterReviewer(state) {
    if (state.reviewPassed)
        return 'verification';
    if ((state.reviewRetryCount ?? 0) < state_1.MAX_REVIEW_RETRIES)
        return 'debugger';
    return 'finalize';
}
function routeAfterVerification(state) {
    const hasIssues = (state.visualIssues ?? []).length > 0 ||
        (state.functionalIssues ?? []).length > 0 ||
        (state.a11yIssues ?? []).length > 0 ||
        (state.e2eFailures ?? []).length > 0 ||
        (state.securityIssues ?? []).length > 0 ||
        (state.seoIssues ?? []).length > 0;
    if (!hasIssues)
        return 'finalize';
    if ((state.retryCount ?? 0) < state_1.MAX_VERIFICATION_RETRIES)
        return 'increment_retry';
    return 'finalize';
}
function routeAfterDatabaseInitializer(state) {
    if (state.workflow === 'new_app')
        return 'planner';
    return 'executor';
}
function routeAfterFileStateTracker(state) {
    const todos = state.todos ?? [];
    const allCompleted = todos.length === 0 || todos.every((t) => t.status === 'completed');
    const loopCount = state.executorLoopCount ?? 0;
    if (state.error)
        return 'reviewer';
    if (loopCount >= 3)
        return 'reviewer';
    if (allCompleted)
        return 'type_checker';
    return 'executor';
}
function routeAfterTypeChecker(state) {
    if (state.typeCheckPassed === false)
        return 'executor';
    return 'reviewer';
}
function buildAgentGraph(checkpointer) {
    const workflow = new langgraph_1.StateGraph(state_1.AgentStateAnnotation)
        .addNode('coordinator', wrapNode('coordinator', coordinator_node_1.coordinatorNode))
        .addNode('analyzer', wrapNode('analyzer', analyzer_node_1.analyzerNode))
        .addNode('template_selector', wrapNode('template_selector', template_selector_node_1.templateSelectorNode))
        .addNode('planner', wrapNode('planner', planner_node_1.plannerNode))
        .addNode('pre_flight_validator', wrapNode('pre_flight_validator', pre_flight_validator_node_1.preFlightValidatorNode))
        .addNode('executor', wrapNode('executor', executor_node_1.executorNode))
        .addNode('file_state_tracker', wrapNode('file_state_tracker', file_state_tracker_node_1.fileStateTrackerNode))
        .addNode('reviewer', wrapNode('reviewer', reviewer_node_1.reviewerNode))
        .addNode('debugger', wrapNode('debugger', debugger_node_1.debuggerNode))
        .addNode('answer_generator', wrapNode('answer_generator', answer_generator_node_1.answerGeneratorNode))
        .addNode('finalize', wrapNode('finalize', finalize_node_1.finalizeNode))
        .addNode('increment_retry', wrapNode('increment_retry', increment_retry_node_1.incrementRetryNode))
        .addNode('type_checker', wrapNode('type_checker', type_checker_node_1.typeCheckerNode))
        .addNode('database_initializer', wrapNode('database_initializer', database_initializer_node_1.databaseInitializerNode))
        .addNode('designer', wrapNode('designer', designer_node_1.designerNode))
        .addNode('component_selector', wrapNode('component_selector', component_selector_node_1.componentSelectorNode))
        .addNode('verification', wrapNode('verification', verification_node_1.verificationNode))
        .addEdge(langgraph_1.START, 'coordinator')
        .addEdge('coordinator', 'analyzer')
        .addEdge('template_selector', 'database_initializer')
        .addEdge('executor', 'file_state_tracker')
        .addEdge('answer_generator', 'finalize')
        .addEdge('finalize', langgraph_1.END)
        .addEdge('increment_retry', 'executor')
        .addConditionalEdges('analyzer', routeAfterAnalyzer, [
        'finalize',
        'answer_generator',
        'designer',
        'debugger',
        'database_initializer',
        'executor',
    ])
        .addConditionalEdges('designer', routeAfterDesigner, ['component_selector'])
        .addConditionalEdges('component_selector', routeAfterComponentSelector, ['template_selector'])
        .addConditionalEdges('database_initializer', routeAfterDatabaseInitializer, [
        'planner',
        'executor',
    ])
        .addConditionalEdges('planner', routeAfterPlanner, ['pre_flight_validator'])
        .addConditionalEdges('pre_flight_validator', routeAfterPreFlightValidator, [
        'executor',
    ])
        .addConditionalEdges('debugger', routeAfterDebugger, ['reviewer'])
        .addConditionalEdges('file_state_tracker', routeAfterFileStateTracker, ['type_checker', 'executor', 'reviewer'])
        .addConditionalEdges('type_checker', routeAfterTypeChecker, ['reviewer', 'executor'])
        .addConditionalEdges('reviewer', routeAfterReviewer, [
        'verification',
        'debugger',
        'finalize',
    ])
        .addConditionalEdges('verification', routeAfterVerification, [
        'finalize',
        'increment_retry',
    ]);
    return workflow.compile({ checkpointer });
}
//# sourceMappingURL=graph.js.map