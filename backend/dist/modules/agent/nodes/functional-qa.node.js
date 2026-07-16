"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFunctionalQa = runFunctionalQa;
exports.functionalQaNode = functionalQaNode;
const playwright_1 = require("playwright");
const concurrency_1 = require("../../../lib/concurrency");
const route_discovery_1 = require("../utils/route-discovery");
const ROUTE_CONCURRENCY = 3;
function isDetailRoute(route) {
    return /:[^/]+/.test(route);
}
function routeToPattern(route) {
    const pattern = route.replace(/\//g, '\\/').replace(/:[^/]+/g, '[^/]+');
    return new RegExp(`^${pattern}$`);
}
async function checkImages(page) {
    const results = [];
    const imgSrcs = await page.evaluate(() => Array.from(document.querySelectorAll('img'))
        .map((img) => img.src)
        .filter((src) => src.includes('/api/files/')));
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
        }
        catch (err) {
            results.push({
                src,
                ok: false,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    return results;
}
async function checkCardNavigation(page, route, detailRoutes) {
    const detailPatterns = detailRoutes.map(routeToPattern);
    const linkPaths = await page.evaluate(() => Array.from(document.querySelectorAll('a[href]'))
        .map((a) => {
        try {
            return new URL(a.href).pathname;
        }
        catch {
            return a.getAttribute('href') ?? '';
        }
    })
        .filter(Boolean));
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
        }
        catch (err) {
            return `${route}: navigation to detail page failed — ${err instanceof Error ? err.message : String(err)}`;
        }
    }
    const buttonSelectors = [
        'button:has-text("View details")',
        'button:has-text("Read more")',
        'button:has-text("Details")',
        'button:has-text("View")',
    ];
    for (const selector of buttonSelectors) {
        const button = page.locator(selector).first();
        if ((await button.count()) === 0)
            continue;
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
    const listItems = await page.locator('[class*="card"], [class*="item"], [class*="product"]').count();
    if (listItems > 0 && detailRoutes.length > 0) {
        return `${route}: found ${listItems} list items/cards but none link to a detail page`;
    }
    return null;
}
async function runFunctionalQa(state, deps, previewUrl, routesSource) {
    const sandboxId = state.sandboxId;
    const issues = [];
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
        const routes = (0, route_discovery_1.discoverRoutes)(routesSource, state.needsIntegration).filter((r) => r && r !== '*' && !r.includes('*'));
        const detailRoutes = routes.filter(isDetailRoute);
        const listRoutes = routes.filter((r) => !isDetailRoute(r));
        let browser;
        try {
            browser = await playwright_1.chromium.launch({ headless: true });
        }
        catch (launchErr) {
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
            const limit = (0, concurrency_1.pLimit)(ROUTE_CONCURRENCY);
            const routeResults = await Promise.all(listRoutes.map((route) => limit(async () => {
                const routeIssues = [];
                const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
                const url = `${previewUrl}${route}`;
                try {
                    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
                    if (!response || !response.ok()) {
                        routeIssues.push(`${route}: page failed to load (HTTP ${response?.status() ?? 'unknown'})`);
                        return routeIssues;
                    }
                    const imageChecks = await checkImages(page);
                    for (const check of imageChecks) {
                        if (!check.ok) {
                            const detail = check.status
                                ? `HTTP ${check.status}, content-type: ${check.contentType ?? 'unknown'}`
                                : check.error ?? 'request failed';
                            routeIssues.push(`${route}: broken image ${check.src} — ${detail}`);
                        }
                    }
                    if (detailRoutes.length > 0) {
                        const navIssue = await checkCardNavigation(page, route, detailRoutes);
                        if (navIssue) {
                            routeIssues.push(navIssue);
                        }
                    }
                }
                catch (navErr) {
                    const message = navErr instanceof Error ? navErr.message : String(navErr);
                    routeIssues.push(`${route}: functional QA navigation failed — ${message}`);
                }
                finally {
                    await page.close();
                }
                return routeIssues;
            })));
            for (const result of routeResults) {
                issues.push(...result);
            }
        }
        finally {
            await browser.close();
        }
    }
    catch (err) {
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
async function functionalQaNode(state, deps) {
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
//# sourceMappingURL=functional-qa.node.js.map