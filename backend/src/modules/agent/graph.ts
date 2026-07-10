import { Logger } from '@nestjs/common';
import {
  END,
  START,
  StateGraph,
  LangGraphRunnableConfig,
  CompiledStateGraph,
} from '@langchain/langgraph';
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { E2BService } from '@/lib/e2b.service';
import { AiGatewayService } from '@/lib/ai-gateway.service';
import { AgentState, AgentStateAnnotation, AgentEvent } from './state';
import { PromptLoaderService } from './services/prompt-loader.service';
import { ModelResolverService } from './services/model-resolver.service';
import { TemplateService } from './services/template.service';
import { AgentPersistenceService } from './services/agent-persistence.service';
import { DatabaseSeederService } from './services/database-seeder.service';
import { AgentMcpToolService } from './services/agent-mcp-tool.service';
import { coordinatorNode } from './nodes/coordinator.node';
import { analyzerNode } from './nodes/analyzer.node';
import { templateSelectorNode } from './nodes/template-selector.node';
import { plannerNode } from './nodes/planner.node';
import { preFlightValidatorNode } from './nodes/pre-flight-validator.node';
import { executorNode } from './nodes/executor.node';
import { fileStateTrackerNode } from './nodes/file-state-tracker.node';
import { reviewerNode } from './nodes/reviewer.node';
import { debuggerNode } from './nodes/debugger.node';
import { answerGeneratorNode } from './nodes/answer-generator.node';
import { finalizeNode } from './nodes/finalize.node';
import { incrementRetryNode } from './nodes/increment-retry.node';
import { typeCheckerNode } from './nodes/type-checker.node';
import { databaseInitializerNode } from './nodes/database-initializer.node';
import { designerNode } from './nodes/designer.node';
import { componentSelectorNode } from './nodes/component-selector.node';
import { visualQaNode } from './nodes/visual-qa.node';
import { functionalQaNode } from './nodes/functional-qa.node';
import { a11yReviewerNode } from './nodes/a11y-reviewer.node';
import { e2eTestGeneratorNode } from './nodes/e2e-test-generator.node';
import { securityReviewerNode } from './nodes/security-reviewer.node';
import { seoMetaNode } from './nodes/seo-meta.node';

export interface GraphDependencies {
  aiGateway: AiGatewayService;
  e2b: E2BService;
  promptLoader: PromptLoaderService;
  modelResolver: ModelResolverService;
  templateService: TemplateService;
  persistence: AgentPersistenceService;
  databaseSeeder: DatabaseSeederService;
  agentMcpToolService: AgentMcpToolService;
  logger: Logger;
  emit: (event: AgentEvent) => void | Promise<void>;
}

type NodeFunction = (
  state: AgentState,
  deps: GraphDependencies,
) => Partial<AgentState> | Promise<Partial<AgentState>>;

function wrapNode(name: string, fn: NodeFunction) {
  return async (
    state: AgentState,
    config: LangGraphRunnableConfig,
  ): Promise<Partial<AgentState>> => {
    const deps = config?.configurable?.deps as GraphDependencies | undefined;
    if (!deps) {
      throw new Error(`Missing graph dependencies for node "${name}"`);
    }
    deps.logger.debug(`Running node: ${name}`);
    return fn(state, deps);
  };
}

function routeAfterAnalyzer(state: AgentState): string {
  if (state.workflow === 'review_fix') return 'executor';
  if (state.needsClarification) return 'finalize';
  if (state.workflow === 'chat') return 'answer_generator';
  if (state.workflow === 'new_app') return 'designer';
  if (state.workflow === 'debug') return 'debugger';
  // For pocketbase-aware edits, verify/collections before editing.
  if (state.needsIntegration === 'pocketbase') return 'database_initializer';
  // Surgical edit path: skip template selection, full planner, and pre-flight
  // validator. The analyzer already produced scope + relevantFiles.
  return 'executor';
}

function routeAfterDesigner(_state: AgentState): string {
  return 'component_selector';
}

function routeAfterComponentSelector(_state: AgentState): string {
  return 'template_selector';
}

function routeAfterPlanner(_state: AgentState): string {
  // The analyzer already routes debug workflows directly to the debugger,
  // so the planner only operates on new_app/edit paths.
  return 'pre_flight_validator';
}

function routeAfterPreFlightValidator(_state: AgentState): string {
  // Pre-flight validator now always fixes and forwards to executor.
  // There is no planner ↔ pre-flight loop.
  return 'executor';
}

function routeAfterDebugger(state: AgentState): string {
  return state.debugFixed ? 'reviewer' : 'executor';
}

function routeAfterReviewer(state: AgentState): string {
  if (state.reviewPassed) return 'visual_qa';
  if ((state.retryCount ?? 0) < 3) return 'debugger';
  // Review has failed repeatedly; stop burning retries and surface the result.
  return 'finalize';
}

function routeAfterVisualQa(state: AgentState): string {
  const issues = state.visualIssues ?? [];
  if (issues.length === 0) return 'functional_qa';
  if ((state.retryCount ?? 0) < 3) return 'increment_retry';
  // Exceeded retry budget; continue to next verification stage rather than loop forever.
  return 'functional_qa';
}

function routeAfterFunctionalQa(state: AgentState): string {
  const issues = state.functionalIssues ?? [];
  if (issues.length === 0) return 'a11y_reviewer';
  if ((state.retryCount ?? 0) < 3) return 'increment_retry';
  // Exceeded retry budget; continue to next verification stage rather than loop forever.
  return 'a11y_reviewer';
}

function routeAfterA11yReviewer(state: AgentState): string {
  const issues = state.a11yIssues ?? [];
  if (issues.length === 0) return 'e2e_test_generator';
  if ((state.retryCount ?? 0) < 3) return 'increment_retry';
  return 'e2e_test_generator';
}

function routeAfterE2eTestGenerator(state: AgentState): string {
  const failures = state.e2eFailures ?? [];
  if (failures.length === 0) return 'security_reviewer';
  if ((state.retryCount ?? 0) < 3) return 'increment_retry';
  return 'security_reviewer';
}

function routeAfterSecurityReviewer(state: AgentState): string {
  const issues = state.securityIssues ?? [];
  if (issues.length === 0) return 'seo_meta';
  if ((state.retryCount ?? 0) < 3) return 'increment_retry';
  return 'seo_meta';
}

function routeAfterSeoMeta(_state: AgentState): string {
  return 'finalize';
}

function routeAfterDatabaseInitializer(state: AgentState): string {
  // After the database initializer, new_app flows continue to the planner;
  // pocketbase-aware edit flows skip the planner and go straight to the executor.
  if (state.workflow === 'new_app') return 'planner';
  return 'executor';
}

function routeAfterFileStateTracker(state: AgentState): string {
  const todos = state.todos ?? [];
  const allCompleted = todos.length === 0 || todos.every((t) => t.status === 'completed');
  const loopCount = state.executorLoopCount ?? 0;

  // Only leave the execution phase when every todo is completed, when the
  // executor reported an error, or when we hit the maximum number of execution
  // passes (to avoid an infinite loop if the model cannot complete the todos).
  if (state.error) return 'reviewer';
  if (loopCount >= 3) return 'reviewer';
  if (allCompleted) return 'type_checker';

  return 'executor';
}

function routeAfterTypeChecker(state: AgentState): string {
  // If type checking failed, send the code back to the executor for fixes.
  // The loop-count guard in routeAfterFileStateTracker prevents infinite retries.
  if (state.typeCheckPassed === false) return 'executor';

  return 'reviewer';
}

export function buildAgentGraph(
  checkpointer?: BaseCheckpointSaver,
): CompiledStateGraph<AgentState, Partial<AgentState>> {
  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode('coordinator', wrapNode('coordinator', coordinatorNode))
    .addNode('analyzer', wrapNode('analyzer', analyzerNode))
    .addNode('template_selector', wrapNode('template_selector', templateSelectorNode))
    .addNode('planner', wrapNode('planner', plannerNode))
    .addNode('pre_flight_validator', wrapNode('pre_flight_validator', preFlightValidatorNode))
    .addNode('executor', wrapNode('executor', executorNode))
    .addNode('file_state_tracker', wrapNode('file_state_tracker', fileStateTrackerNode))
    .addNode('reviewer', wrapNode('reviewer', reviewerNode))
    .addNode('debugger', wrapNode('debugger', debuggerNode))
    .addNode('answer_generator', wrapNode('answer_generator', answerGeneratorNode))
    .addNode('finalize', wrapNode('finalize', finalizeNode))
    .addNode('increment_retry', wrapNode('increment_retry', incrementRetryNode))
    .addNode('type_checker', wrapNode('type_checker', typeCheckerNode))
    .addNode('database_initializer', wrapNode('database_initializer', databaseInitializerNode))
    .addNode('designer', wrapNode('designer', designerNode))
    .addNode('component_selector', wrapNode('component_selector', componentSelectorNode))
    .addNode('visual_qa', wrapNode('visual_qa', visualQaNode))
    .addNode('functional_qa', wrapNode('functional_qa', functionalQaNode))
    .addNode('a11y_reviewer', wrapNode('a11y_reviewer', a11yReviewerNode))
    .addNode('e2e_test_generator', wrapNode('e2e_test_generator', e2eTestGeneratorNode))
    .addNode('security_reviewer', wrapNode('security_reviewer', securityReviewerNode))
    .addNode('seo_meta', wrapNode('seo_meta', seoMetaNode))
    // Entry / linear segments
    .addEdge(START, 'coordinator')
    .addEdge('coordinator', 'analyzer')
    .addEdge('designer', 'component_selector')
    .addEdge('component_selector', 'template_selector')
    .addEdge('template_selector', 'database_initializer')
    .addEdge('database_initializer', 'planner')
    .addEdge('executor', 'file_state_tracker')
    .addEdge('answer_generator', 'finalize')
    .addEdge('finalize', END)
    .addEdge('increment_retry', 'executor')
    // Conditional routing
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

  return workflow.compile({ checkpointer }) as CompiledStateGraph<
    AgentState,
    Partial<AgentState>
  >;
}
