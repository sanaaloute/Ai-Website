import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
import { discoverRoutes, readRoutes } from '../utils/route-discovery';

export async function a11yReviewerNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>> {
  const sandboxId = state.sandboxId;
  const issues: string[] = [];

  try {
    await deps.emit({
      type: 'status',
      data: { status: 'reviewing', message: 'Running accessibility audit...' },
    });

    const previewUrl = await deps.e2b.getPreviewUrl(sandboxId);
    const routesSource = await readRoutes(deps.e2b, sandboxId);
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
        verificationFailures: [...(state.verificationFailures ?? []), ...issues.map((i) => `a11y_reviewer: ${i}`)].slice(-20),
        messages: [{ role: 'assistant', content: `A11y review skipped: ${message}` }],
      };
    }

    try {
      for (const route of routes) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        try {
          await page.goto(`${previewUrl}${route}`, { waitUntil: 'networkidle', timeout: 30_000 });
          const analysis = await new AxeBuilder({ page }).analyze();
          for (const violation of analysis.violations) {
            issues.push(
              `${route}: [${violation.impact}] ${violation.help} (${violation.nodes.length} element(s))`,
            );
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          issues.push(`${route}: a11y audit failed — ${message}`);
        } finally {
          await page.close();
        }
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
    verificationFailures: issues.length
      ? [...(state.verificationFailures ?? []), ...issues.map((i) => `a11y_reviewer: ${i}`)].slice(-20)
      : state.verificationFailures,
    messages: [{ role: 'assistant', content: `A11y review: ${issues.length} violations` }],
  };
}
