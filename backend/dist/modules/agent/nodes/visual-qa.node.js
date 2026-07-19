"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runVisualQa = runVisualQa;
exports.visualQaNode = visualQaNode;
const playwright_1 = require("playwright");
const concurrency_1 = require("../../../lib/concurrency");
const promises_1 = require("fs/promises");
const os_1 = require("os");
const path = __importStar(require("path"));
const route_discovery_1 = require("../utils/route-discovery");
const ROUTE_CONCURRENCY = 3;
async function runVisualQa(state, deps, previewUrl, routesSource) {
    const sandboxId = state.sandboxId;
    const issues = [];
    let screenshotDir;
    let screenshotCount = 0;
    const screenshots = [];
    try {
        await deps.emit({
            type: 'status',
            data: { status: 'reviewing', message: 'Running visual QA (screenshots + smoke tests)...' },
        });
        const routes = (0, route_discovery_1.discoverRoutes)(routesSource, state.needsIntegration);
        screenshotDir = await (0, promises_1.mkdtemp)(path.join((0, os_1.tmpdir)(), `visual-qa-${sandboxId}-`));
        let browser;
        try {
            browser = await playwright_1.chromium.launch({ headless: true });
        }
        catch (launchErr) {
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
            const limit = (0, concurrency_1.pLimit)(ROUTE_CONCURRENCY);
            const routeResults = await Promise.all(routes.map((route) => limit(async () => {
                const routeIssues = [];
                const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
                const consoleErrors = [];
                const pageErrors = [];
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
                    const screenshotPath = path.join(screenshotDir, `${safeRoute}.png`);
                    await page.screenshot({ path: screenshotPath, fullPage: true });
                    screenshots.push({ path: screenshotPath, route });
                    screenshotCount++;
                    if (pageErrors.length) {
                        routeIssues.push(`${route}: JavaScript errors — ${pageErrors.slice(0, 3).join('; ')}`);
                    }
                    if (consoleErrors.length) {
                        routeIssues.push(`${route}: console errors — ${consoleErrors.slice(0, 3).join('; ')}`);
                    }
                }
                catch (navErr) {
                    const message = navErr instanceof Error ? navErr.message : String(navErr);
                    routeIssues.push(`${route}: navigation failed — ${message}`);
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
        deps.logger.error(`Visual QA node failed: ${message}`);
        issues.push(`Visual QA system error: ${message}`);
    }
    finally {
        if (screenshotDir) {
            try {
                await (0, promises_1.rm)(screenshotDir, { recursive: true, force: true });
            }
            catch (cleanupErr) {
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
async function visualQaNode(state, deps) {
    const sandboxId = state.sandboxId;
    const issues = [];
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
    }
    catch (err) {
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
//# sourceMappingURL=visual-qa.node.js.map