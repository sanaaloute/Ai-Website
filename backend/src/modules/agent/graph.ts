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
import { AgentState, AgentStateAnnotation, AgentEvent, MAX_REVIEW_RETRIES, MAX_VERIFICATION_RETRIES } from './state';
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
import { verificationNode } from './nodes/verification.node';
import type { TemplateCopyResult } from './nodes/template-selector.node';
import {
  isCancellation,
  sleepWithSignal,
  throwIfCancelled,
} from '@/lib/cancellation';
import { env } from '@/config/env';

/** How many times a failed agent node is retried before giving up (env: AGENT_MAX_NODE_ATTEMPTS). */
function maxNodeAttempts(): number {
  return env().agentMaxNodeAttempts;
}

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
  /** User-initiated cancellation; checked at every level of the workflow. */
  signal?: AbortSignal;
  /**
   * Template copy started in parallel with the designer node. The template
   * selector awaits (and consumes) this instead of copying sequentially.
   *
   * This MUST be a mutable box shared by reference: wrapNode hands each node a
   * shallow copy of deps ({...deps, emit}), so a node assigning
   * `deps.templateCopy = …` would mutate a throwaway object and the consumer
   * would never see it. Writing `deps.templateCopy.current = …` mutates the
   * shared box, which every node's copy points to.
   */
  templateCopy: {
    current?: {
      category: string;
      promise: Promise<TemplateCopyResult>;
    };
  };
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
    const signal = deps.signal ?? (config?.signal as AbortSignal | undefined);
    throwIfCancelled(signal);
    deps.logger.debug(`Running node: ${name}`);
    // Tag every event emitted inside this node with the node name so the
    // frontend can attribute streamed tokens to the agent that produced them.
    const nodeDeps: GraphDependencies = {
      ...deps,
      emit: (event) =>
        deps.emit({
          ...event,
          data: { ...(event.data ?? {}), node: name },
        }),
    };

    // Retry policy: if an agent node throws or reports a failed status
    // (returns an `error` field), retry up to maxAttempts times with a
    // backoff before continuing to the next step. Cancellation is never
    // retried — it propagates immediately.
    const maxAttempts = maxNodeAttempts();
    let lastError: unknown;
    let failedResult: Partial<AgentState> | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      throwIfCancelled(signal);
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
            deps.logger.warn(
              `Node ${name} reported failure (attempt ${attempt}/${maxAttempts}): ${result.error}`,
            );
            await sleepWithSignal(1000 * attempt, signal);
            continue;
          }
        }
        return result;
      } catch (e) {
        if (isCancellation(e)) throw e;
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
          deps.logger.warn(
            `Node ${name} threw (attempt ${attempt}/${maxAttempts}): ${message}`,
          );
          await sleepWithSignal(1000 * attempt, signal);
          continue;
        }
      }
    }

    // Attempts exhausted: if a node returned a failed status, hand that
    // result back so existing error routing still applies; otherwise rethrow
    // the last unexpected error.
    if (failedResult) return failedResult;
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  };
}

function routeAfterAnalyzer(state: AgentState): string {
  if (state.workflow === 'review_fix') return 'executor';
  if (state.needsClarification) return 'finalize';
  if (state.workflow === 'chat') return 'answer_generator';
  if (state.workflow === 'new_app') return 'designer';
  if (state.workflow === 'debug') return 'debugger';
  // For DB-backed edits (PocketBase or Prisma), verify collections/tables first.
  if (state.needsIntegration) return 'database_initializer';
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

function routeAfterDebugger(_state: AgentState): string {
  // The debugger is the dedicated fix agent for reviewer/type-checker issues.
  // It always returns to the reviewer for re-verification; broad rewrites are
  // intentionally not handed back to the executor.
  return 'reviewer';
}

function routeAfterReviewer(state: AgentState): string {
  if (state.reviewPassed) return 'verification';
  // Review loop has its own budget (reviewRetryCount), separate from the
  // verification loop's retryCount.
  if ((state.reviewRetryCount ?? 0) < MAX_REVIEW_RETRIES) return 'debugger';
  // Review has failed repeatedly; stop burning retries and surface the result.
  return 'finalize';
}

function routeAfterVerification(state: AgentState): string {
  // Only the CURRENT round's issue arrays may drive routing. The accumulated
  // `verificationFailures` list is capped history for reporting — checking it
  // here (as was done for seo_meta:) re-triggered retries on stale entries
  // after the issue had already been fixed.
  const hasIssues =
    (state.visualIssues ?? []).length > 0 ||
    (state.functionalIssues ?? []).length > 0 ||
    (state.a11yIssues ?? []).length > 0 ||
    (state.e2eFailures ?? []).length > 0 ||
    (state.securityIssues ?? []).length > 0 ||
    (state.seoIssues ?? []).length > 0;

  if (!hasIssues) return 'finalize';
  if ((state.retryCount ?? 0) < MAX_VERIFICATION_RETRIES) return 'increment_retry';
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
    .addNode('verification', wrapNode('verification', verificationNode))
    // Entry / linear segments. NOTE: never add a static edge from a node that
    // also has conditional edges — LangGraph follows BOTH, which would run the
    // two targets in parallel (this previously ran planner and executor
    // concurrently on the edit-with-DB path).
    .addEdge(START, 'coordinator')
    .addEdge('coordinator', 'analyzer')
    .addEdge('template_selector', 'database_initializer')
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

  return workflow.compile({ checkpointer }) as CompiledStateGraph<
    AgentState,
    Partial<AgentState>
  >;
}
