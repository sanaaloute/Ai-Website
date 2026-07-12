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
exports.e2eTestGeneratorNode = e2eTestGeneratorNode;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const route_discovery_1 = require("../utils/route-discovery");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
function extractCode(text) {
    const tsMatch = text.match(/```(?:typescript|ts)\n([\s\S]*?)```/);
    if (tsMatch)
        return tsMatch[1].trim();
    const genericMatch = text.match(/```\n([\s\S]*?)```/);
    if (genericMatch)
        return genericMatch[1].trim();
    return text.trim();
}
async function ensureTestRunnerDependencies(testDir) {
    const nodeModulesLink = path.join(testDir, 'node_modules');
    try {
        await fs_1.promises.lstat(nodeModulesLink);
        return;
    }
    catch {
    }
    const backendNodeModules = path.join(process.cwd(), 'node_modules');
    try {
        await fs_1.promises.lstat(backendNodeModules);
    }
    catch {
        return;
    }
    await fs_1.promises.symlink(backendNodeModules, nodeModulesLink, 'dir');
}
async function e2eTestGeneratorNode(state, deps) {
    const sandboxId = state.sandboxId;
    const failures = [];
    const testsWritten = [];
    try {
        await deps.emit({
            type: 'status',
            data: { status: 'reviewing', message: 'Generating and running E2E tests...' },
        });
        const previewUrl = await deps.e2b.getPreviewUrl(sandboxId);
        const routesSource = await (0, route_discovery_1.readRoutes)(deps.e2b, sandboxId);
        const routes = (0, route_discovery_1.discoverRoutes)(routesSource, state.needsIntegration);
        const systemPrompt = await deps.promptLoader.load('e2e-test-generator');
        const context = JSON.stringify({
            websiteCategory: state.websiteCategory,
            websiteType: state.websiteType,
            designSpec: state.designSpec,
            planSteps: state.planSteps,
            routes,
            previewUrl,
        });
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: context },
        ];
        const rawCode = await deps.aiGateway.chatCompletionsStream(messages, deps.modelResolver.resolveSequence('e2e_test_generator'), state.aiCredentials);
        const testCode = extractCode(rawCode);
        const testDir = `/tmp/e2e-tests-${sandboxId}`;
        await fs_1.promises.mkdir(testDir, { recursive: true });
        await ensureTestRunnerDependencies(testDir);
        const testFile = path.join(testDir, 'generated.spec.ts');
        await fs_1.promises.writeFile(testFile, testCode, 'utf8');
        testsWritten.push(testFile);
        const configFile = path.join(testDir, 'playwright.config.ts');
        await fs_1.promises.writeFile(configFile, `import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: { trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});`, 'utf8');
        try {
            const { stdout, stderr } = await execAsync('npx playwright test --config=playwright.config.ts', {
                cwd: testDir,
                timeout: 120_000,
            });
            if (stderr) {
                deps.logger.debug(`E2E stderr: ${stderr}`);
            }
            deps.logger.debug(`E2E stdout: ${stdout.slice(0, 500)}`);
        }
        catch (runErr) {
            const runError = runErr;
            const output = [runError.stdout, runError.stderr, runError.message]
                .filter(Boolean)
                .join('\n')
                .slice(0, 2000);
            failures.push(`E2E tests failed:\n${output}`);
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        deps.logger.error(`E2E test generator failed: ${message}`);
        failures.push(`E2E system error: ${message}`);
    }
    return {
        e2eFailures: failures,
        e2eTestsWritten: testsWritten,
        lastVerificationStage: failures.length > 0 ? 'e2e_test_generator' : undefined,
        verificationFailures: failures.length
            ? [...(state.verificationFailures ?? []), ...failures.map((f) => `e2e_test_generator: ${f}`)].slice(-20)
            : state.verificationFailures,
        messages: [{ role: 'assistant', content: `E2E tests: ${failures.length ? 'failed' : 'passed'} (${testsWritten.length} spec files)` }],
    };
}
//# sourceMappingURL=e2e-test-generator.node.js.map