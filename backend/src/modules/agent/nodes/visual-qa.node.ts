import { chromium } from 'playwright';
import { pLimit } from '@/lib/concurrency';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';
import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
import { discoverRoutes } from '../utils/route-discovery';

const ROUTE_CONCURRENCY = 3;

export interface VisualQaResult {
  visualIssues: string[];
  screenshots: Array<{ path: string; route: string }>;
  lastVerificationStage?: string;
  verificationFailures?: string[];
  messages: Array<{ role: string; content: string }>;
}

export async function runVisualQa(
  state: AgentState,
  deps: GraphDependencies,
  previewUrl: string,
  routesSource: string,
): Promise<VisualQaResult> {
  const sandboxId = state.sandboxId;
  const issues: string[] = [];
  let screenshotDir: string | undefined;
  let screenshotCount = 0;
  const screenshots: Array<{ path: string; route: string }> = [];

  try {
    await deps.emit({
      type: 'status',
      data: { status: 'reviewing', message: 'Running visual QA (screenshots + smoke tests)...' },
    });

    const routes = discoverRoutes(routesSource, state.needsIntegration);
    screenshotDir = await mkdtemp(path.join(tmpdir(), `visual-qa-${sandboxId}-`));

    let browser;
    try {
      browser = await chromium.launch({ headless: true });
    } catch (launchErr) {
      const message = launchErr instanceof Error ? launchErr.message : String(launchErr);
      deps.logger.error(`Playwright browser launch failed: ${message}`);
      issues.push(`Could not launch browser for visual QA: ${message}`);
      return {
        visualIssues: issues,
        screenshots: [],
        lastVerificationStage: 'visual_qa',
        verificationFailures: issues.map((i) => `visual_qa: ${i}`),
        messages: [{ role: 'assistant', content: `Visual QA skipped: ${message}` }],
      };
    }

    try {
      const limit = pLimit(ROUTE_CONCURRENCY);
      const routeResults = await Promise.all(
        routes.map((route) =>
          limit(async () => {
            const routeIssues: string[] = [];
            const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
            const consoleErrors: string[] = [];
            const pageErrors: string[] = [];

            page.on('pageerror', (err) => pageErrors.push(err.message));
            page.on('console', (msg) => {
              if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
              }
            });

            const url = `${previewUrl}${route}`;
            try {
              const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
              if (!response) {
                routeIssues.push(`${route}: no HTTP response`);
                return routeIssues;
              }
              if (!response.ok() && response.status() !== 304) {
                routeIssues.push(`${route}: HTTP ${response.status()}`);
              }

              const title = await page.title().catch(() => '');
              if (!title.trim()) {
                routeIssues.push(`${route}: empty page title`);
              }

              const bodyText = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');
              if (bodyText.trim().length < 20) {
                routeIssues.push(`${route}: page body is nearly empty`);
              }

              const safeRoute = route.replace(/\//g, '_') || 'root';
              const screenshotPath = path.join(screenshotDir!, `${safeRoute}.png`);
              await page.screenshot({ path: screenshotPath, fullPage: true });
              screenshots.push({ path: screenshotPath, route });
              screenshotCount++;

              if (pageErrors.length) {
                routeIssues.push(`${route}: JavaScript errors — ${pageErrors.slice(0, 3).join('; ')}`);
              }
              if (consoleErrors.length) {
                routeIssues.push(`${route}: console errors — ${consoleErrors.slice(0, 3).join('; ')}`);
              }
            } catch (navErr) {
              const message = navErr instanceof Error ? navErr.message : String(navErr);
              routeIssues.push(`${route}: navigation failed — ${message}`);
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
    deps.logger.error(`Visual QA node failed: ${message}`);
    issues.push(`Visual QA system error: ${message}`);
  } finally {
    if (screenshotDir) {
      try {
        await rm(screenshotDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        const cleanupMessage = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
        deps.logger.warn(`Failed to clean up visual QA screenshots: ${cleanupMessage}`);
      }
    }
  }

  return {
    visualIssues: issues,
    screenshots: [],
    lastVerificationStage: issues.length > 0 ? 'visual_qa' : undefined,
    verificationFailures: issues.map((i) => `visual_qa: ${i}`),
    messages: [
      {
        role: 'assistant',
        content: `Visual QA: ${issues.length} issues, ${screenshotCount} screenshots captured and cleaned up`,
      },
    ],
  };
}

export async function visualQaNode(
  state: AgentState,
  deps: GraphDependencies,
): Promise<Partial<AgentState>> {
  const sandboxId = state.sandboxId;
  const issues: string[] = [];
  let screenshotCount = 0;

  try {
    const restarted = await deps.e2b.restartPreview(sandboxId);
    if (!restarted) {
      issues.push('Preview server failed to start or become reachable.');
    }

    const previewUrl = await deps.e2b.getPreviewUrl(sandboxId);
    const routesSource = (await deps.e2b.readFile(sandboxId, 'src/lib/routes.ts')) ?? '';
    const result = await runVisualQa(state, deps, previewUrl, routesSource);

    const nextFailures = result.visualIssues.length
      ? [...(state.verificationFailures ?? []), ...result.visualIssues.map((i) => `visual_qa: ${i}`)].slice(-20)
      : state.verificationFailures;

    return {
      ...result,
      verificationFailures: nextFailures,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    deps.logger.error(`Visual QA node failed: ${message}`);
    issues.push(`Visual QA system error: ${message}`);
    return {
      visualIssues: issues,
      screenshots: [],
      lastVerificationStage: 'visual_qa',
      verificationFailures: [...(state.verificationFailures ?? []), ...issues.map((i) => `visual_qa: ${i}`)].slice(-20),
      messages: [{ role: 'assistant', content: `Visual QA error: ${message}` }],
    };
  }
}
