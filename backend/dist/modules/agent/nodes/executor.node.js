"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executorNode = executorNode;
const tools_1 = require("../tools");
const types_1 = require("../../../types");
function buildExecutorContext(state) {
    const workflow = state.workflow || 'edit';
    const intent = state.intent || 'edit';
    const baseContext = {
        workflow,
        intent,
        userRequest: state.prompt,
        scope: state.scope || '',
        relevantFiles: state.relevantFiles ?? [],
        websiteCategory: state.websiteCategory,
        websiteType: state.websiteType,
        needsIntegration: state.needsIntegration,
        designSpec: state.designSpec,
        componentsToInstall: state.componentsToInstall,
        dbSchemaTemplate: state.dbSchemaTemplate ?? {},
        databaseStatus: state.databaseStatus ?? { checked: false },
        todos: state.todos ?? [],
    };
    if (workflow === 'new_app') {
        baseContext.mode = 'OVERWRITE';
        baseContext.instruction = 'You are building a new website from scratch. Overwrite ALL existing scaffold files to match the design spec. Create new section components. The template has been pre-loaded — build ON TOP of it.';
        baseContext.design = state.planDesign || '';
        baseContext.newFiles = state.planNewFiles ?? [];
        baseContext.steps = state.planSteps ?? [];
    }
    else if (workflow === 'edit') {
        baseContext.mode = 'SURGICAL';
        baseContext.instruction = 'You are making surgical edits to existing code. Read files first, then use search_replace or write_file. NEVER overwrite an entire file unless explicitly asked.';
        baseContext.design = state.planDesign || '';
        baseContext.newFiles = state.planNewFiles ?? [];
        baseContext.steps = state.planSteps ?? [];
    }
    else if (workflow === 'debug') {
        const affected = state.bugAffectedFiles ?? [];
        const rootCause = state.bugRootCause || '';
        baseContext.mode = 'TARGETED_FIX';
        baseContext.instruction = `You are fixing a bug. ONLY touch these files: ${affected.join(', ')}. Root cause: ${rootCause}. Make the SMALLEST possible change to fix the issue. Do NOT refactor, redesign, or change unrelated code.`;
        baseContext.affectedFiles = affected;
        baseContext.rootCause = rootCause;
        baseContext.remainingErrors = state.debugRemainingErrors ?? [];
    }
    else if (workflow === 'review_fix') {
        const issues = state.reviewIssues ?? [];
        baseContext.mode = 'REVIEW_FIX';
        baseContext.instruction = `You are fixing code that failed review. Address EVERY issue in the review feedback. Read the full codebase first, then apply all fixes. Do NOT introduce unrelated changes.`;
        baseContext.reviewFeedback = issues;
        baseContext.todos = state.todos ?? [];
    }
    const retry = state.retryCount ?? 0;
    if (retry > 0) {
        const issues = state.reviewIssues ?? [];
        baseContext.retryAttempt = retry;
        baseContext.reviewFeedback = issues;
        baseContext.instruction = `${baseContext.instruction}\n\nRETRY #${retry}: Previous attempt failed review. Fix these issues:\n${issues.map((i) => `- ${i}`).join('\n')}`;
    }
    const typeErrors = state.typeCheckErrors ?? [];
    if (typeErrors.length > 0) {
        baseContext.typeCheckErrors = typeErrors;
        baseContext.instruction = `${baseContext.instruction}\n\nPREVIOUS ATTEMPT FAILED TYPE CHECK. Fix these TypeScript errors before doing anything else:\n${typeErrors.map((e) => `- ${e}`).join('\n')}`;
    }
    const verificationIssues = [
        ...(state.visualIssues ?? []),
        ...(state.functionalIssues ?? []),
        ...(state.a11yIssues ?? []),
        ...(state.e2eFailures ?? []),
        ...(state.securityIssues ?? []),
    ];
    if (verificationIssues.length > 0) {
        baseContext.lastVerificationStage = state.lastVerificationStage;
        baseContext.verificationFailures = state.verificationFailures ?? [];
        baseContext.instruction = `${baseContext.instruction}\n\nPREVIOUS ATTEMPT FAILED ${state.lastVerificationStage ? state.lastVerificationStage.toUpperCase() : 'VERIFICATION'}. Fix these issues before doing anything else:\n${verificationIssues.map((i) => `- ${i}`).join('\n')}`;
    }
    return JSON.stringify(baseContext, null, 2);
}
function createAgentContext(state, deps) {
    const sandboxProvider = new tools_1.SandboxProvider(deps.e2b, state.sandboxId, state.projectId);
    const streamWriter = new tools_1.CallbackStreamWriter((event) => {
        if (event.type === 'file_update') {
            deps.emit({ type: 'file_update', data: event.data });
        }
        else if (event.type === 'todos_update') {
            deps.emit({ type: 'todos_update', data: event.data });
        }
        else if (event.type === 'command_delta' || event.type === 'tool_progress') {
            deps.emit({ type: event.type, data: event.data });
        }
        else if (event.type === 'tool_start') {
            deps.emit({ type: 'tool_start', data: event.data });
        }
        else {
            deps.logger.debug(`[tool event] ${event.type}: ${JSON.stringify(event.data).slice(0, 200)}`);
        }
    });
    return {
        sandboxProvider,
        streamWriter,
        fileManifest: new tools_1.FileManifest(),
        todos: state.todos ?? [],
        supabaseProjectId: state.projectId,
        userId: state.userId,
        chatId: state.sandboxId,
    };
}
async function buildFilesWritten(manifest, sandboxProvider, deps) {
    const changed = manifest.listChanged();
    const filesWritten = [];
    for (const entry of changed) {
        if (entry.status === 'deleted') {
            filesWritten.push({ path: entry.path, status: 'deleted' });
            continue;
        }
        let content;
        try {
            content = await sandboxProvider.readFile(entry.path);
        }
        catch (e) {
            deps.logger.warn(`Could not read written file for state tracking: ${entry.path}`);
        }
        filesWritten.push({
            path: entry.path,
            status: entry.status === 'created' ? 'created' : 'modified',
            content,
        });
    }
    return filesWritten;
}
async function executorNode(state, deps) {
    const context = createAgentContext(state, deps);
    const docTools = deps.agentMcpToolService?.getTools(context) ?? [];
    const tools = (0, tools_1.buildToolSet)(context, docTools);
    const toolDefinitions = (0, tools_1.toolsToDefinitions)(tools);
    const aiCredentials = state.aiCredentials;
    const systemPrompt = await deps.promptLoader.load('executor');
    const ctx = buildExecutorContext(state);
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Context:\n${ctx}\n\nExecute the plan using the available tools.\n\nUser request: ${(0, types_1.promptToString)(state.prompt)}` },
    ];
    const installed = [];
    const failedPackages = [];
    try {
        await context.sandboxProvider.ensureAlive(state.userId);
        const maxIterations = 15;
        let iteration = 0;
        let finalContent = '';
        await deps.emit({
            type: 'status',
            data: {
                status: 'executing',
                message: `Implementing ${state.todos?.length ?? 0} steps...`,
            },
        });
        await deps.emit({
            type: 'tool_progress',
            data: {
                tool: 'executor',
                message: `Planning ${state.todos?.length ?? 0} code changes...`,
                percent: 5,
            },
        });
        const executeSingleToolCall = async (toolCall) => {
            const result = await (0, tools_1.executeToolCall)(toolCall, tools);
            const args = (() => {
                try {
                    return JSON.parse(toolCall.function.arguments);
                }
                catch {
                    return {};
                }
            })();
            const packageName = typeof args.package === 'string' ? args.package : undefined;
            if (result.name === 'add_dependency' && packageName) {
                if (result.success) {
                    installed.push(packageName);
                }
                else {
                    failedPackages.push({ package: packageName, error: result.content });
                }
            }
            deps.logger.debug(`Tool call: ${result.name}(${JSON.stringify(args).slice(0, 200)})`);
            return result;
        };
        while (iteration < maxIterations) {
            iteration++;
            deps.logger.debug(`Executor iteration ${iteration}`);
            const { content, toolCalls, toolResults } = await deps.aiGateway.chatCompletionsWithToolsStream(messages, toolDefinitions, deps.modelResolver.resolveSequence('executor'), aiCredentials, async (token, kind) => {
                await deps.emit({ type: 'token', data: { content: token, kind } });
            }, async (toolCall) => executeSingleToolCall(toolCall), async (path) => {
                deps.logger.debug(`[executor file_start] ${path}`);
                await deps.emit({ type: 'file_start', data: { path } });
            });
            if (content) {
                finalContent = content;
                deps.logger.debug(`Executor content preview: ${content.slice(0, 200)}`);
            }
            if (!toolCalls.length) {
                break;
            }
            messages.push({
                role: 'assistant',
                content: content ?? null,
                tool_calls: toolCalls,
            });
            for (const tr of toolResults) {
                messages.push({
                    role: 'tool',
                    tool_call_id: tr.toolCallId,
                    name: tr.name,
                    content: tr.content,
                });
            }
        }
        const plannedPackages = state.packagesToInstall ?? [];
        const addDependencyTool = tools.find((t) => t.name === 'add_dependency');
        for (const pkg of plannedPackages) {
            let resultText = '';
            let success = false;
            if (addDependencyTool) {
                try {
                    resultText = await addDependencyTool.invoke({ package: pkg });
                    success = true;
                }
                catch (err) {
                    resultText = `Error executing add_dependency: ${err instanceof Error ? err.message : String(err)}`;
                }
            }
            else {
                resultText = 'Error: add_dependency tool not available';
            }
            if (success) {
                installed.push(pkg);
            }
            else {
                failedPackages.push({ package: pkg, error: resultText });
            }
            deps.logger.log(`Package install result: ${pkg} - ${resultText}`);
        }
        const filesWritten = await buildFilesWritten(context.fileManifest, context.sandboxProvider, deps);
        const currentSandboxId = await context.sandboxProvider.ensureAlive(state.userId);
        const workflow = state.workflow || 'edit';
        const hadFailures = filesWritten.some((fw) => fw.status === 'failed') || failedPackages.length > 0;
        return {
            sandboxId: currentSandboxId,
            filesWritten,
            packagesInstalled: installed,
            packagesFailed: failedPackages,
            todos: context.todos,
            executorLoopCount: (state.executorLoopCount ?? 0) + 1,
            error: hadFailures ? 'Some files or packages failed' : undefined,
            messages: [{ role: 'assistant', content: `[${workflow}] Wrote ${filesWritten.filter((f) => f.status === 'written' || f.status === 'modified' || f.status === 'created').length} files` }],
        };
    }
    catch (e) {
        deps.logger.error(`Executor node failed: ${e instanceof Error ? e.message : String(e)}`);
        const filesWritten = await buildFilesWritten(context.fileManifest, context.sandboxProvider, deps).catch(() => []);
        return {
            filesWritten,
            packagesInstalled: installed,
            packagesFailed: failedPackages,
            todos: context.todos,
            executorLoopCount: (state.executorLoopCount ?? 0) + 1,
            error: e instanceof Error ? e.message : String(e),
            messages: [{ role: 'assistant', content: `Execution error: ${e instanceof Error ? e.message : String(e)}` }],
        };
    }
}
//# sourceMappingURL=executor.node.js.map