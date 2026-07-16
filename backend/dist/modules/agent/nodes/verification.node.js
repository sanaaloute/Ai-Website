"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationNode = verificationNode;
const route_discovery_1 = require("../utils/route-discovery");
const visual_qa_node_1 = require("./visual-qa.node");
const functional_qa_node_1 = require("./functional-qa.node");
const a11y_reviewer_node_1 = require("./a11y-reviewer.node");
const e2e_test_generator_node_1 = require("./e2e-test-generator.node");
const security_reviewer_node_1 = require("./security-reviewer.node");
const seo_meta_node_1 = require("./seo-meta.node");
async function verificationNode(state, deps) {
    const sandboxId = state.sandboxId;
    try {
        await deps.emit({
            type: 'status',
            data: { status: 'reviewing', message: 'Running verification suite (QA, security, SEO, E2E)...' },
        });
        await deps.emit({
            type: 'status',
            data: { status: 'reviewing', message: 'Ensuring preview server is running...' },
        });
        const previewRunning = await deps.e2b.ensurePreviewRunning(sandboxId);
        if (!previewRunning) {
            deps.logger.warn(`Preview server did not become healthy for verification in sandbox ${sandboxId}`);
        }
        const previewUrl = await deps.e2b.getPreviewUrl(sandboxId);
        const { source: routesSource, cached: routesCached } = await (0, route_discovery_1.getRoutesSource)(deps.e2b, sandboxId, state);
        const [visualResult, functionalResult, a11yResult, e2eResult, securityResult, seoResult,] = await Promise.all([
            (0, visual_qa_node_1.runVisualQa)(state, deps, previewUrl, routesSource),
            (0, functional_qa_node_1.runFunctionalQa)(state, deps, previewUrl, routesSource),
            (0, a11y_reviewer_node_1.runA11yReview)(state, deps, previewUrl, routesSource),
            (0, e2e_test_generator_node_1.runE2eTests)(state, deps, previewUrl, routesSource),
            (0, security_reviewer_node_1.runSecurityReview)(state, deps),
            (0, seo_meta_node_1.runSeoMeta)(state, deps, previewUrl, routesSource),
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
        const stageOrder = ['visual_qa', 'functional_qa', 'a11y_reviewer', 'e2e_test_generator', 'security_reviewer', 'seo_meta'];
        let lastVerificationStage;
        for (const stage of stageOrder) {
            if ((stage === 'visual_qa' && visualResult.visualIssues.length) ||
                (stage === 'functional_qa' && functionalResult.functionalIssues.length) ||
                (stage === 'a11y_reviewer' && a11yResult.a11yIssues.length) ||
                (stage === 'e2e_test_generator' && e2eResult.e2eFailures.length) ||
                (stage === 'security_reviewer' && securityResult.securityIssues.length) ||
                (stage === 'seo_meta' && seoResult.verificationFailures?.length)) {
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
    }
    catch (err) {
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
//# sourceMappingURL=verification.node.js.map