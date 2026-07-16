import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
import { getRoutesSource } from '../utils/route-discovery';
import { runVisualQa } from './visual-qa.node';
import { runFunctionalQa } from './functional-qa.node';
import { runA11yReview } from './a11y-reviewer.node';
import { runE2eTests } from './e2e-test-generator.node';
import { runSecurityReview } from './security-reviewer.node';
import { runSeoMeta } from './seo-meta.node';

/**
 * Combined verification node.
 *
 * Replaces the previous linear chain of QA nodes with a single parallel stage.
 * It ensures the preview is running once, reads the route source once, then runs
 * visual, functional, accessibility, E2E, security, and SEO checks concurrently.
 */
export async function verificationNode(
  state: AgentState,
  deps: GraphDependencies,
): Promise<Partial<AgentState>> {
  const sandboxId = state.sandboxId;

  try {
    await deps.emit({
      type: 'status',
      data: { status: 'reviewing', message: 'Running verification suite (QA, security, SEO, E2E)...' },
    });

    // Ensure the dev server is running once for the whole verification stage.
    // Do a lightweight health check first; only pay for a full restart if needed.
    await deps.emit({
      type: 'status',
      data: { status: 'reviewing', message: 'Ensuring preview server is running...' },
    });
    const previewRunning = await deps.e2b.ensurePreviewRunning(sandboxId);
    if (!previewRunning) {
      deps.logger.warn(`Preview server did not become healthy for verification in sandbox ${sandboxId}`);
    }

    const previewUrl = await deps.e2b.getPreviewUrl(sandboxId);
    const { source: routesSource, cached: routesCached } = await getRoutesSource(deps.e2b, sandboxId, state);

    // Run all verification substages concurrently. Each substage is independent
    // (SEO writes files, security writes temp pattern files, the rest are read-only),
    // so parallel execution is safe.
    const [
      visualResult,
      functionalResult,
      a11yResult,
      e2eResult,
      securityResult,
      seoResult,
    ] = await Promise.all([
      runVisualQa(state, deps, previewUrl, routesSource),
      runFunctionalQa(state, deps, previewUrl, routesSource),
      runA11yReview(state, deps, previewUrl, routesSource),
      runE2eTests(state, deps, previewUrl, routesSource),
      runSecurityReview(state, deps),
      runSeoMeta(state, deps, previewUrl, routesSource),
    ]);

    const allIssues = [
      ...visualResult.visualIssues.map((i) => `visual_qa: ${i}`),
      ...functionalResult.functionalIssues.map((i) => `functional_qa: ${i}`),
      ...a11yResult.a11yIssues.map((i) => `a11y_reviewer: ${i}`),
      ...e2eResult.e2eFailures.map((i) => `e2e_test_generator: ${i}`),
      ...securityResult.securityIssues.map((i) => `security_reviewer: ${i}`),
      ...(seoResult.verificationFailures ?? []),
    ];

    const verificationFailures = allIssues.length
      ? [...(state.verificationFailures ?? []), ...allIssues].slice(-20)
      : state.verificationFailures;

    // Preserve the most specific failing stage for the executor's retry context.
    const stageOrder = ['visual_qa', 'functional_qa', 'a11y_reviewer', 'e2e_test_generator', 'security_reviewer', 'seo_meta'] as const;
    let lastVerificationStage: string | undefined;
    for (const stage of stageOrder) {
      if (
        (stage === 'visual_qa' && visualResult.visualIssues.length) ||
        (stage === 'functional_qa' && functionalResult.functionalIssues.length) ||
        (stage === 'a11y_reviewer' && a11yResult.a11yIssues.length) ||
        (stage === 'e2e_test_generator' && e2eResult.e2eFailures.length) ||
        (stage === 'security_reviewer' && securityResult.securityIssues.length) ||
        (stage === 'seo_meta' && seoResult.verificationFailures?.length)
      ) {
        lastVerificationStage = stage;
        break;
      }
    }

    const messages = [
      ...visualResult.messages,
      ...functionalResult.messages,
      ...a11yResult.messages,
      ...e2eResult.messages,
      ...securityResult.messages,
      ...seoResult.messages,
      {
        role: 'assistant',
        content: `Verification suite complete: ${allIssues.length} total issue(s)`,
      },
    ];

    return {
      visualIssues: visualResult.visualIssues,
      functionalIssues: functionalResult.functionalIssues,
      a11yIssues: a11yResult.a11yIssues,
      e2eFailures: e2eResult.e2eFailures,
      e2eTestsWritten: e2eResult.e2eTestsWritten,
      securityIssues: securityResult.securityIssues,
      seoGenerated: seoResult.seoGenerated,
      screenshots: visualResult.screenshots,
      verificationFailures,
      lastVerificationStage,
      previewHealthy: previewRunning,
      routesSource: routesCached ? undefined : routesSource,
      messages,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    deps.logger.error(`Verification node failed: ${message}`);
    return {
      visualIssues: [],
      functionalIssues: [],
      a11yIssues: [],
      e2eFailures: [`verification: ${message}`],
      securityIssues: [],
      seoGenerated: false,
      verificationFailures: [...(state.verificationFailures ?? []), `verification: ${message}`].slice(-20),
      lastVerificationStage: 'verification',
      previewHealthy: false,
      messages: [{ role: 'assistant', content: `Verification suite error: ${message}` }],
    };
  }
}
