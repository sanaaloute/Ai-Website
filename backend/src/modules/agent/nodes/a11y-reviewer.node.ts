import { chromium } from 'playwright';
import { pLimit } from '@/lib/concurrency';
import AxeBuilder from '@axe-core/playwright';
import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
import { discoverRoutes } from '../utils/route-discovery';

const ROUTE_CONCURRENCY = 3;

export interface A11yReviewResult {
  a11yIssues: string[];
  lastVerificationStage?: string;
  verificationFailures?: string[];
  messages: Array<{ role: string; content: string }>;
}

export async function runA11yReview(
  state: AgentState,
  deps: GraphDependencies,
  previewUrl: string,
  routesSource: string,
): Promise<A11yReviewResult> {
  const issues: string[] = [];

  try {
    await deps.emit({
      type: 'status',
      data: { status: 'reviewing', message: 'Running accessibility audit...' },
    });

    const routes = discoverRoutes(routesSource, state.needsIntegration);

    let browser;
    try {
      browser = await chromium.launch({ headless: true });
    } catch (launchErr) {
      const message = launchErr instanceof Error ? launchErr.message : String(launchErr);
      deps.logger.error(`Playwright browser launch failed: ${message}`);
      issues.push(`Could not launch browser for a11y review: ${message}`);
      return {
        a11yIssues: issues,
        lastVerificationStage: 'a11y_reviewer',
        verificationFailures: issues.map((i) => `a11y_reviewer: ${i}`),
        messages: [{ role: 'assistant', content: `A11y review skipped: ${message}` }],
      };
    }

    try {
      const limit = pLimit(ROUTE_CONCURRENCY);
      const routeResults = await Promise.all(
        routes.map((route) =>
          limit(async () => {
            const routeIssues: string[] = [];
            const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
            try {
              await page.goto(`${previewUrl}${route}`, { waitUntil: 'networkidle', timeout: 30_000 });
              const analysis = await new AxeBuilder({ page }).analyze();
              for (const violation of analysis.violations) {
                routeIssues.push(
                  `${route}: [${violation.impact}] ${violation.help} (${violation.nodes.length} element(s))`,
                );
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              routeIssues.push(`${route}: a11y audit failed — ${message}`);
            } finally {
              await page.close();
            }
            return routeIssues;
          }),
        ),
      );

      for (const result of routeResults) {
        issues.push(...result);
      }
    } finally {
      await browser.close();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    deps.logger.error(`A11y reviewer failed: ${message}`);
    issues.push(`A11y system error: ${message}`);
  }

  return {
    a11yIssues: issues,
    lastVerificationStage: issues.length > 0 ? 'a11y_reviewer' : undefined,
    verificationFailures: issues.map((i) => `a11y_reviewer: ${i}`),
    messages: [{ role: 'assistant', content: `A11y review: ${issues.length} violations` }],
  };
}

export async function a11yReviewerNode(
  state: AgentState,
  deps: GraphDependencies,
): Promise<Partial<AgentState>> {
  const previewUrl = await deps.e2b.getPreviewUrl(state.sandboxId);
  const routesSource = (await deps.e2b.readFile(state.sandboxId, 'src/lib/routes.ts')) ?? '';
  const result = await runA11yReview(state, deps, previewUrl, routesSource);

  const nextFailures = result.a11yIssues.length
    ? [...(state.verificationFailures ?? []), ...result.a11yIssues.map((i) => `a11y_reviewer: ${i}`)].slice(-20)
    : state.verificationFailures;

  return {
    ...result,
    verificationFailures: nextFailures,
  };
}
