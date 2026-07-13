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
const visual_qa_node_1 = require("./nodes/visual-qa.node");
const functional_qa_node_1 = require("./nodes/functional-qa.node");
const a11y_reviewer_node_1 = require("./nodes/a11y-reviewer.node");
const e2e_test_generator_node_1 = require("./nodes/e2e-test-generator.node");
const security_reviewer_node_1 = require("./nodes/security-reviewer.node");
const seo_meta_node_1 = require("./nodes/seo-meta.node");
const cancellation_1 = require("../../lib/cancellation");
const MAX_NODE_ATTEMPTS = 3;
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
        let lastError;
        let failedResult = null;
        for (let attempt = 1; attempt <= MAX_NODE_ATTEMPTS; attempt++) {
            (0, cancellation_1.throwIfCancelled)(signal);
            try {
                const result = await fn(state, nodeDeps);
                if (result && typeof result.error === 'string' && result.error) {
                    failedResult = result;
                    lastError = new Error(result.error);
                    if (attempt < MAX_NODE_ATTEMPTS) {
                        await nodeDeps.emit({
                            type: 'status',
                            data: {
                                status: 'retrying',
                                message: `${name} failed, retrying (${attempt + 1}/${MAX_NODE_ATTEMPTS})...`,
                            },
                        });
                        deps.logger.warn(`Node ${name} reported failure (attempt ${attempt}/${MAX_NODE_ATTEMPTS}): ${result.error}`);
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
                if (attempt < MAX_NODE_ATTEMPTS) {
                    const message = e instanceof Error ? e.message : String(e);
                    await nodeDeps.emit({
                        type: 'status',
                        data: {
                            status: 'retrying',
                            message: `${name} failed, retrying (${attempt + 1}/${MAX_NODE_ATTEMPTS})...`,
                        },
                    });
                    deps.logger.warn(`Node ${name} threw (attempt ${attempt}/${MAX_NODE_ATTEMPTS}): ${message}`);
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
function routeAfterDebugger(state) {
    return state.debugFixed ? 'reviewer' : 'executor';
}
function routeAfterReviewer(state) {
    if (state.reviewPassed)
        return 'visual_qa';
    if ((state.retryCount ?? 0) < 3)
        return 'debugger';
    return 'finalize';
}
function routeAfterVisualQa(state) {
    const issues = state.visualIssues ?? [];
    if (issues.length === 0)
        return 'functional_qa';
    if ((state.retryCount ?? 0) < 3)
        return 'increment_retry';
    return 'functional_qa';
}
function routeAfterFunctionalQa(state) {
    const issues = state.functionalIssues ?? [];
    if (issues.length === 0)
        return 'a11y_reviewer';
    if ((state.retryCount ?? 0) < 3)
        return 'increment_retry';
    return 'a11y_reviewer';
}
function routeAfterA11yReviewer(state) {
    const issues = state.a11yIssues ?? [];
    if (issues.length === 0)
        return 'e2e_test_generator';
    if ((state.retryCount ?? 0) < 3)
        return 'increment_retry';
    return 'e2e_test_generator';
}
function routeAfterE2eTestGenerator(state) {
    const failures = state.e2eFailures ?? [];
    if (failures.length === 0)
        return 'security_reviewer';
    if ((state.retryCount ?? 0) < 3)
        return 'increment_retry';
    return 'security_reviewer';
}
function routeAfterSecurityReviewer(state) {
    const issues = state.securityIssues ?? [];
    if (issues.length === 0)
        return 'seo_meta';
    if ((state.retryCount ?? 0) < 3)
        return 'increment_retry';
    return 'seo_meta';
}
function routeAfterSeoMeta(_state) {
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
        .addNode('visual_qa', wrapNode('visual_qa', visual_qa_node_1.visualQaNode))
        .addNode('functional_qa', wrapNode('functional_qa', functional_qa_node_1.functionalQaNode))
        .addNode('a11y_reviewer', wrapNode('a11y_reviewer', a11y_reviewer_node_1.a11yReviewerNode))
        .addNode('e2e_test_generator', wrapNode('e2e_test_generator', e2e_test_generator_node_1.e2eTestGeneratorNode))
        .addNode('security_reviewer', wrapNode('security_reviewer', security_reviewer_node_1.securityReviewerNode))
        .addNode('seo_meta', wrapNode('seo_meta', seo_meta_node_1.seoMetaNode))
        .addEdge(langgraph_1.START, 'coordinator')
        .addEdge('coordinator', 'analyzer')
        .addEdge('designer', 'component_selector')
        .addEdge('component_selector', 'template_selector')
        .addEdge('template_selector', 'database_initializer')
        .addEdge('database_initializer', 'planner')
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
        .addConditionalEdges('debugger', routeAfterDebugger, ['reviewer', 'executor'])
        .addConditionalEdges('file_state_tracker', routeAfterFileStateTracker, ['type_checker', 'executor', 'reviewer'])
        .addConditionalEdges('type_checker', routeAfterTypeChecker, ['reviewer', 'executor'])
        .addConditionalEdges('reviewer', routeAfterReviewer, [
        'visual_qa',
        'debugger',
        'finalize',
    ])
        .addConditionalEdges('visual_qa', routeAfterVisualQa, ['functional_qa', 'increment_retry'])
        .addConditionalEdges('functional_qa', routeAfterFunctionalQa, ['a11y_reviewer', 'increment_retry'])
        .addConditionalEdges('a11y_reviewer', routeAfterA11yReviewer, ['e2e_test_generator', 'increment_retry'])
        .addConditionalEdges('e2e_test_generator', routeAfterE2eTestGenerator, ['security_reviewer', 'increment_retry'])
        .addConditionalEdges('security_reviewer', routeAfterSecurityReviewer, ['seo_meta', 'increment_retry'])
        .addConditionalEdges('seo_meta', routeAfterSeoMeta, ['finalize']);
    return workflow.compile({ checkpointer });
}
//# sourceMappingURL=graph.js.map