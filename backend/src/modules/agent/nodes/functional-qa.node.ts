import { chromium } from 'playwright';
import { pLimit } from '@/lib/concurrency';
import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
import { discoverRoutes } from '../utils/route-discovery';

const ROUTE_CONCURRENCY = 3;

interface ImageCheck {
  src: string;
  ok: boolean;
  status?: number;
  contentType?: string;
  error?: string;
}

export interface FunctionalQaResult {
  functionalIssues: string[];
  lastVerificationStage?: string;
  verificationFailures?: string[];
  messages: Array<{ role: string; content: string }>;
}

function isDetailRoute(route: string): boolean {
  return /:[^/]+/.test(route);
}

function routeToPattern(route: string): RegExp {
  // Escape slashes and replace :param with a wildcard.
  const pattern = route.replace(/\//g, '\\/').replace(/:[^/]+/g, '[^/]+');
  return new RegExp(`^${pattern}$`);
}

async function checkImages(page: import('playwright').Page): Promise<ImageCheck[]> {
  const results: ImageCheck[] = [];
  const imgSrcs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img'))
      .map((img) => img.src)
      .filter((src) => src.includes('/api/files/'))
  );

  for (const src of imgSrcs) {
    try {
      const response = await page.request.get(src);
      const status = response.status();
      const headers = await response.headers();
      const contentType = headers['content-type'] || '';
      results.push({
        src,
        ok: status >= 200 && status < 300 && contentType.startsWith('image/'),
        status,
        contentType,
      });
    } catch (err) {
      results.push({
        src,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

async function checkCardNavigation(
  page: import('playwright').Page,
  route: string,
  detailRoutes: string[],
): Promise<string | null> {
  const detailPatterns = detailRoutes.map(routeToPattern);

  // Find links that navigate to a detail route (compare pathnames, not absolute URLs).
  const linkPaths = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map((a) => {
        try {
          return new URL((a as HTMLAnchorElement).href).pathname;
        } catch {
          return (a as HTMLAnchorElement).getAttribute('href') ?? '';
        }
      })
      .filter(Boolean),
  );

  const detailPath = linkPaths.find((path) => detailPatterns.some((pattern) => pattern.test(path)));

  if (detailPath) {
    try {
      const detailUrl = new URL(detailPath, page.url()).toString();
      await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 15_000 });
      const bodyText = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');
      if (bodyText.trim().length < 20) {
        return `${route}: detail page ${page.url()} body is nearly empty`;
      }
      return null;
    } catch (err) {
      return `${route}: navigation to detail page failed — ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // Fallback: look for buttons with text suggesting a detail view.
  const buttonSelectors = [
    'button:has-text("View details")',
    'button:has-text("Read more")',
    'button:has-text("Details")',
    'button:has-text("View")',
  ];

  for (const selector of buttonSelectors) {
    const button = page.locator(selector).first();
    if ((await button.count()) === 0) continue;

    const [navigation] = await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15_000 }).catch(() => null),
      button.click(),
    ]);

    if (!navigation) {
      return `${route}: "View details" button did not navigate`;
    }

    const url = new URL(page.url());
    if (!detailPatterns.some((pattern) => pattern.test(url.pathname))) {
      return `${route}: button navigated to ${url} which does not match any detail route`;
    }

    const bodyText = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');
    if (bodyText.trim().length < 20) {
      return `${route}: detail page ${url} body is nearly empty`;
    }

    return null;
  }

  // No clickable card or button found. Only report if the page has list-like content.
  const listItems = await page.locator('[class*="card"], [class*="item"], [class*="product"]').count();
  if (listItems > 0 && detailRoutes.length > 0) {
    return `${route}: found ${listItems} list items/cards but none link to a detail page`;
  }

  return null;
}

export async function runFunctionalQa(
  state: AgentState,
  deps: GraphDependencies,
  previewUrl: string,
  routesSource: string,
): Promise<FunctionalQaResult> {
  const sandboxId = state.sandboxId;
  const issues: string[] = [];

  try {
    await deps.emit({
      type: 'status',
      data: { status: 'reviewing', message: 'Running functional QA (images + interactivity)...' },
    });

    if (!previewUrl) {
      issues.push('Preview server URL is not available.');
      return {
        functionalIssues: issues,
        lastVerificationStage: 'functional_qa',
        verificationFailures: issues.map((i) => `functional_qa: ${i}`),
        messages: [{ role: 'assistant', content: `Functional QA skipped: preview URL missing` }],
      };
    }

    const routes = discoverRoutes(routesSource, state.needsIntegration).filter(
      (r) => r && r !== '*' && !r.includes('*'),
    );
    const detailRoutes = routes.filter(isDetailRoute);
    const listRoutes = routes.filter((r) => !isDetailRoute(r));

    let browser;
    try {
      browser = await chromium.launch({ headless: true });
    } catch (launchErr) {
      const message = launchErr instanceof Error ? launchErr.message : String(launchErr);
      deps.logger.error(`Playwright browser launch failed: ${message}`);
      issues.push(`Could not launch browser for functional QA: ${message}`);
      return {
        functionalIssues: issues,
        lastVerificationStage: 'functional_qa',
        verificationFailures: issues.map((i) => `functional_qa: ${i}`),
        messages: [{ role: 'assistant', content: `Functional QA skipped: ${message}` }],
      };
    }

    try {
      const limit = pLimit(ROUTE_CONCURRENCY);
      const routeResults = await Promise.all(
        listRoutes.map((route) =>
          limit(async () => {
            const routeIssues: string[] = [];
            const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
            const url = `${previewUrl}${route}`;

            try {
              const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
              if (!response || !response.ok()) {
                routeIssues.push(`${route}: page failed to load (HTTP ${response?.status() ?? 'unknown'})`);
                return routeIssues;
              }

              // Check PocketBase-backed images resolve correctly.
              const imageChecks = await checkImages(page);
              for (const check of imageChecks) {
                if (!check.ok) {
                  const detail = check.status
                    ? `HTTP ${check.status}, content-type: ${check.contentType ?? 'unknown'}`
                    : check.error ?? 'request failed';
                  routeIssues.push(`${route}: broken image ${check.src} — ${detail}`);
                }
              }

              // Check list → detail navigation when detail routes exist.
              if (detailRoutes.length > 0) {
                const navIssue = await checkCardNavigation(page, route, detailRoutes);
                if (navIssue) {
                  routeIssues.push(navIssue);
                }
              }
            } catch (navErr) {
              const message = navErr instanceof Error ? navErr.message : String(navErr);
              routeIssues.push(`${route}: functional QA navigation failed — ${message}`);
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
    deps.logger.error(`Functional QA node failed: ${message}`);
    issues.push(`Functional QA system error: ${message}`);
  }

  return {
    functionalIssues: issues,
    lastVerificationStage: issues.length > 0 ? 'functional_qa' : undefined,
    verificationFailures: issues.map((i) => `functional_qa: ${i}`),
    messages: [
      {
        role: 'assistant',
        content: `Functional QA: ${issues.length} issues found`,
      },
    ],
  };
}

export async function functionalQaNode(
  state: AgentState,
  deps: GraphDependencies,
): Promise<Partial<AgentState>> {
  const previewUrl = await deps.e2b.getPreviewUrl(state.sandboxId);
  const routesSource = (await deps.e2b.readFile(state.sandboxId, 'src/lib/routes.ts')) ?? '';
  const result = await runFunctionalQa(state, deps, previewUrl, routesSource);

  const nextFailures = result.functionalIssues.length
    ? [...(state.verificationFailures ?? []), ...result.functionalIssues.map((i) => `functional_qa: ${i}`)].slice(-20)
    : state.verificationFailures;

  return {
    ...result,
    verificationFailures: nextFailures,
  };
}
