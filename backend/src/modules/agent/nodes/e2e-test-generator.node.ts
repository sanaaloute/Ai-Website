import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as path from 'path';
import { AgentState } from '../state';
import { GraphDependencies } from '../graph';
import { discoverRoutes, readRoutes } from '../utils/route-discovery';

const execAsync = promisify(exec);

function extractCode(text: string): string {
  const tsMatch = text.match(/```(?:typescript|ts)\n([\s\S]*?)```/);
  if (tsMatch) return tsMatch[1].trim();
  const genericMatch = text.match(/```\n([\s\S]*?)```/);
  if (genericMatch) return genericMatch[1].trim();
  return text.trim();
}

/**
 * Ensure the standalone E2E test directory can resolve `@playwright/test`.
 * We symlink the backend's node_modules into the temp directory so the config
 * file and spec can import Playwright without a separate npm install.
 */
async function ensureTestRunnerDependencies(testDir: string): Promise<void> {
  const nodeModulesLink = path.join(testDir, 'node_modules');
  try {
    await fs.lstat(nodeModulesLink);
    return;
  } catch {
    // link does not exist yet
  }
  const backendNodeModules = path.join(process.cwd(), 'node_modules');
  try {
    await fs.lstat(backendNodeModules);
  } catch {
    // Backend node_modules not found; the test run will fail gracefully and
    // report the missing dependency instead of crashing the agent.
    return;
  }
  await fs.symlink(backendNodeModules, nodeModulesLink, 'dir');
}

export async function e2eTestGeneratorNode(state: AgentState, deps: GraphDependencies): Promise<Partial<AgentState>> {
  const sandboxId = state.sandboxId;
  const failures: string[] = [];
  const testsWritten: string[] = [];

  try {
    await deps.emit({
      type: 'status',
      data: { status: 'reviewing', message: 'Generating and running E2E tests...' },
    });

    const previewUrl = await deps.e2b.getPreviewUrl(sandboxId);
    const routesSource = await readRoutes(deps.e2b, sandboxId);
    const routes = discoverRoutes(routesSource, state.needsIntegration);

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

    const rawCode = await deps.aiGateway.chatCompletionsStream(
      messages,
      deps.modelResolver.resolveSequence('e2e_test_generator'),
      state.aiCredentials,
    );

    const testCode = extractCode(rawCode);
    const testDir = `/tmp/e2e-tests-${sandboxId}`;
    await fs.mkdir(testDir, { recursive: true });
    await ensureTestRunnerDependencies(testDir);

    const testFile = path.join(testDir, 'generated.spec.ts');
    await fs.writeFile(testFile, testCode, 'utf8');
    testsWritten.push(testFile);

    // Minimal Playwright config so the test can run standalone.
    const configFile = path.join(testDir, 'playwright.config.ts');
    await fs.writeFile(
      configFile,
      `import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: { trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});`,
      'utf8',
    );

    try {
      const { stdout, stderr } = await execAsync('npx playwright test --config=playwright.config.ts', {
        cwd: testDir,
        timeout: 120_000,
      });
      if (stderr) {
        deps.logger.debug(`E2E stderr: ${stderr}`);
      }
      deps.logger.debug(`E2E stdout: ${stdout.slice(0, 500)}`);
    } catch (runErr) {
      const runError = runErr as { stdout?: string; stderr?: string; message?: string };
      const output = [runError.stdout, runError.stderr, runError.message]
        .filter(Boolean)
        .join('\n')
        .slice(0, 2000);
      failures.push(`E2E tests failed:\n${output}`);
    }
  } catch (err) {
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
