"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runA11yReview = runA11yReview;
exports.a11yReviewerNode = a11yReviewerNode;
const playwright_1 = require("playwright");
const concurrency_1 = require("../../../lib/concurrency");
const playwright_2 = __importDefault(require("@axe-core/playwright"));
const route_discovery_1 = require("../utils/route-discovery");
const ROUTE_CONCURRENCY = 3;
async function runA11yReview(state, deps, previewUrl, routesSource) {
    const issues = [];
    try {
        await deps.emit({
            type: 'status',
            data: { status: 'reviewing', message: 'Running accessibility audit...' },
        });
        const routes = (0, route_discovery_1.discoverRoutes)(routesSource, state.needsIntegration);
        let browser;
        try {
            browser = await playwright_1.chromium.launch({ headless: true });
        }
        catch (launchErr) {
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
            const limit = (0, concurrency_1.pLimit)(ROUTE_CONCURRENCY);
            const routeResults = await Promise.all(routes.map((route) => limit(async () => {
                const routeIssues = [];
                const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
                try {
                    await page.goto(`${previewUrl}${route}`, { waitUntil: 'networkidle', timeout: 30_000 });
                    const analysis = await new playwright_2.default({ page }).analyze();
                    for (const violation of analysis.violations) {
                        routeIssues.push(`${route}: [${violation.impact}] ${violation.help} (${violation.nodes.length} element(s))`);
                    }
                }
                catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    routeIssues.push(`${route}: a11y audit failed — ${message}`);
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
async function a11yReviewerNode(state, deps) {
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
//# sourceMappingURL=a11y-reviewer.node.js.map