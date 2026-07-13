import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Res,
  Logger,
  HttpStatus,
  HttpException,
  Delete,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { AuthGuard } from '@/common/guards/auth.guard';
import { ApiKeyGuard } from '@/common/guards/api-key.guard';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { User, PromptContent, PromptPart, TextPromptPart, ImagePromptPart } from '@/types';
import { AiGatewayService } from '@/lib/ai-gateway.service';
import { E2BService, FORBIDDEN_PATH_PREFIXES } from '@/lib/e2b.service';
import { ProviderKeysService } from '@/modules/profile/provider-keys.service';
import { AiCredential } from '@/lib/llm-providers';
import { EntitlementsService } from '@/modules/billing/entitlements.service';
import { AgentService } from './agent.service';
import { AgentEvent } from './state';
import { ModelResolverService } from './services/model-resolver.service';
import { AgentJobService, AgentSessionData } from '@/modules/job-queue/agent-job.service';
import { IdempotencyService } from '@/lib/idempotency.service';
import { RateLimitService } from '@/common/guards/rate-limit.service';
import { AgentStreamRateLimitGuard } from '@/common/guards/rate-limit.guard';

const WORKDIR = '/home/user/app';
import {
  ChatDto,
  AnalyzeEditIntentDto,
  CodeComponentDto,
  CodePageDto,
  DesignTokensDto,
  SummarizeSpecDto,
  UiUxBlueprintDto,
  FilePlanDto,
} from './dto/ai-helper.dto';

function sseInit(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(':ok\n\n');
}

function sseWrite(res: Response, payload: Record<string, unknown> | AgentEvent) {
  if (res.writableEnded) return;
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  (res as unknown as { flush?: () => void }).flush?.();
}

function sseDone(res: Response) {
  if (!res.writableEnded) {
    res.write(`data: {"type":"done","data":{}}\n\n`);
    res.end();
  }
}

@Controller('api')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(
    private readonly ai: AiGatewayService,
    private readonly e2b: E2BService,
    private readonly providerKeys: ProviderKeysService,
    private readonly entitlements: EntitlementsService,
    private readonly agentService: AgentService,
    private readonly modelResolver: ModelResolverService,
    private readonly agentJobService: AgentJobService,
    private readonly rateLimitService: RateLimitService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post('agent-sessions')
  @UseGuards(AuthGuard)
  async createAgentSession(
    @CurrentUser() user: User,
    @Body() body: Record<string, unknown>,
  ) {
    const prompt = this.validatePrompt(body.prompt);
    const templateRepo = typeof body.templateRepo === 'string' ? body.templateRepo : undefined;
    if (templateRepo) {
      // Starting from a pre-built template is a Standard+ feature.
      await this.entitlements.assertFeature(user.id, 'templates');
    }
    const sessionData: Omit<AgentSessionData, 'userId'> = {
      prompt: prompt ?? undefined,
      templateRepo,
      templatePrompt: typeof body.templatePrompt === 'string' ? body.templatePrompt : undefined,
      projectName: typeof body.projectName === 'string' ? body.projectName : undefined,
    };

    const sessionId = await this.agentJobService.createSession(user.id, sessionData);
    return { success: true, sessionId };
  }

  @Get('agent-sessions/:sessionId')
  @UseGuards(AuthGuard)
  async getAgentSession(
    @CurrentUser() user: User,
    @Param('sessionId') sessionId: string,
  ) {
    const session = await this.agentJobService.getSession(sessionId);
    if (!session || session.userId !== user.id) {
      throw new HttpException({ success: false, error: 'Session not found' }, HttpStatus.NOT_FOUND);
    }
    return { success: true, session };
  }

  @Post('agent-stream')
  @UseGuards(AuthGuard, ApiKeyGuard, AgentStreamRateLimitGuard)
  async agentStream(
    @CurrentUser() user: User,
    @Body() body: Record<string, unknown>,
  ) {
    if (!body.sandboxId || typeof body.sandboxId !== 'string') {
      throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);
    }
    const sandboxId = body.sandboxId;

    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
    return this.idempotency.process(
      idempotencyKey,
      async () => {
        let prompt: AgentSessionData['prompt'] | undefined;
        let sessionId: string | undefined;

        // Plan gating: fresh generations consume the plan quota. Resumes of
        // an interrupted run are free continuations.
        const resumeReview = this.validateResumeReview(body.resumeReview);
        const isContinuation = body.resume === true || resumeReview !== undefined;
        if (!isContinuation) {
          await this.entitlements.consumeGeneration(user.id);
        }

        if (typeof body.sessionId === 'string') {
          const session = await this.agentJobService.getSession(body.sessionId);
          if (!session || session.userId !== user.id) {
            throw new HttpException({ success: false, error: 'Session not found' }, HttpStatus.NOT_FOUND);
          }
          prompt = session.prompt;
          sessionId = body.sessionId;
        } else {
          // Legacy compatibility: accept a raw prompt and create an ephemeral session.
          const validated = this.validatePrompt(body.prompt);
          if (!validated) {
            throw new HttpException({ success: false, error: 'prompt must be a non-empty string or an array of text/image_url parts, or provide sessionId' }, HttpStatus.BAD_REQUEST);
          }
          sessionId = await this.agentJobService.createSession(user.id, { prompt: validated });
          prompt = validated;
        }

        const job = await this.agentJobService.enqueue(
          {
            sessionId,
            userId: user.id,
            sandboxId,
            projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
            threadId: typeof body.threadId === 'string' && body.threadId ? body.threadId : undefined,
            resume: body.resume === true,
            chatHistory: Array.isArray(body.chatHistory)
              ? body.chatHistory.filter(
                  (h): h is { role: string; content: string } =>
                    typeof h === 'object' && h !== null && 'role' in h && 'content' in h,
                )
              : [],
            resumeReview,
            prompt,
          },
          idempotencyKey || `${user.id}:${sessionId}:${sandboxId}`,
        );

        await this.rateLimitService.reserveConcurrentGeneration(user.id, job.id!);

        return { success: true, jobId: job.id, status: 'queued' };
      },
      86400,
    );
  }

  @Post('agent-jobs/:jobId/cancel')
  @UseGuards(AuthGuard)
  async cancelAgentJob(
    @CurrentUser() user: User,
    @Param('jobId') jobId: string,
  ) {
    const job = await this.agentJobService.getJob(jobId);
    if (!job) {
      throw new HttpException({ success: false, error: 'Job not found' }, HttpStatus.NOT_FOUND);
    }
    if (job.data.userId !== user.id) {
      throw new HttpException({ success: false, error: 'Forbidden' }, HttpStatus.FORBIDDEN);
    }

    const wasActiveOrWaiting = await this.agentJobService.cancel(jobId);
    // Release the concurrent-generation slot so the user can start a new one.
    await this.rateLimitService.releaseConcurrentGeneration(user.id, jobId);

    return {
      success: true,
      cancelled: wasActiveOrWaiting,
      message: wasActiveOrWaiting ? 'Job cancelled' : 'Job already completed or failed',
    };
  }

  @Get('agent-stream/:jobId')
  @UseGuards(AuthGuard)
  async subscribeToAgentStream(
    @CurrentUser() user: User,
    @Param('jobId') jobId: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const job = await this.agentJobService.getJob(jobId);
    if (!job) {
      throw new HttpException({ success: false, error: 'Job not found' }, HttpStatus.NOT_FOUND);
    }
    if (job.data.userId !== user.id) {
      throw new HttpException({ success: false, error: 'Forbidden' }, HttpStatus.FORBIDDEN);
    }

    sseInit(res);

    const abort = () => {
      if (!res.writableEnded) res.end();
    };
    res.req.on('close', abort);

    // Replay already-completed jobs immediately.
    const state = await job.getState();
    const progress = (await job.progress) as Record<string, unknown> | undefined;
    if (state === 'completed') {
      sseWrite(res, { type: 'status', data: { status: 'completed', message: 'Generation completed' } });
      if (typeof progress?.previewUrl === 'string') {
        sseWrite(res, { type: 'preview', data: { url: progress.previewUrl } });
      }
      sseWrite(res, { type: 'done', data: progress ?? {} });
      res.end();
      return;
    }
    if (state === 'failed') {
      sseWrite(res, { type: 'error', data: { message: job.failedReason || 'Generation failed' } });
      sseWrite(res, { type: 'done', data: {} });
      res.end();
      return;
    }

    const { unsubscribe } = this.agentJobService.subscribeToEvents(jobId, (event) => {
      sseWrite(res, event);
      if (event.type === 'done' || event.type === 'error') {
        unsubscribe();
        if (!res.writableEnded) res.end();
      }
    });

    // Safety: close SSE if the job finishes or fails while we were subscribing.
    const checkInterval = setInterval(async () => {
      const currentState = await job.getState();
      if (currentState === 'completed' || currentState === 'failed') {
        clearInterval(checkInterval);
        unsubscribe();
        if (!res.writableEnded) res.end();
      }
    }, 5000);

    res.req.on('close', () => {
      clearInterval(checkInterval);
      unsubscribe();
    });
  }

  @Post('chat')
  @UseGuards(AuthGuard, ApiKeyGuard)
  async chat(
    @CurrentUser() user: User,
    @Body() body: ChatDto,
    @Res({ passthrough: false }) res: Response,
  ) {
    sseInit(res);
    res.req.on('close', () => {
      if (!res.writableEnded) res.end();
    });

    try {
      const aiCredentials = await this.fetchUserCredentials(user.id);
      const stream = await this.ai.chat(body.prompt, this.modelResolver.resolveSequence('chat'), aiCredentials);
      for await (const chunk of stream) {
        sseWrite(res, chunk);
      }
    } catch (err) {
      sseWrite(res, { type: 'error', data: { message: err instanceof Error ? err.message : String(err) } });
    } finally {
      sseDone(res);
    }
  }

  @Post('apply-ai-code-stream')
  @UseGuards(AuthGuard)
  async applyAiCodeStream(
    @CurrentUser() _user: User,
    @Body() body: { response?: string; sandboxId?: string; packages?: string[]; idempotencyKey?: string },
    @Res({ passthrough: false }) res: Response,
  ) {
    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';

    if (idempotencyKey) {
      const cached = await this.idempotency.get<{
        packages?: string[];
        completionAck: { status: string; token: string; streamVersion: number };
        results: Record<string, unknown>;
      }>(idempotencyKey);
      if (cached) {
        sseInit(res);
        sseWrite(res, { type: 'start', message: 'Applying AI code' });
        sseWrite(res, { type: 'step', message: 'Parsing response', packages: cached.packages ?? [] });
        sseWrite(res, { type: 'complete', completionAck: cached.completionAck, results: cached.results });
        sseDone(res);
        return;
      }
    }

    sseInit(res);
    res.req.on('close', () => {
      if (!res.writableEnded) res.end();
    });

    const packagesInstalled: string[] = [];
    const packagesFailed: string[] = [];
    const commandsExecuted: string[] = [];
    const errors: string[] = [];
    const filesCreated: string[] = [];
    const filesUpdated: string[] = [];

    try {
      sseWrite(res, { type: 'start', message: 'Applying AI code' });
      sseWrite(res, { type: 'step', message: 'Parsing response', packages: body.packages ?? [] });

      const files = this.parseFiles(body.response ?? '{}');

      for (const file of files) {
        if (body.sandboxId) {
          await this.e2b.writeFile(body.sandboxId, file.path, file.content);
        }
        filesCreated.push(file.path);
        sseWrite(res, { type: 'file-progress', fileName: file.path });
        sseWrite(res, { type: 'file-complete', fileName: file.path });
      }

      if (body.packages?.length && body.sandboxId) {
        sseWrite(res, {
          type: 'step',
          message: `Installing ${body.packages.length} packages`,
          packages: body.packages,
        });
        const command = `npm install ${body.packages.join(' ')}`;
        commandsExecuted.push(command);

        const stdoutChunks: string[] = [];
        const stderrChunks: string[] = [];

        const result = await this.e2b.runCommand(body.sandboxId, command, WORKDIR, {
          timeoutMs: 10 * 60 * 1000,
          onStdout: (data) => {
            stdoutChunks.push(data);
            sseWrite(res, { type: 'command-output', output: data, stream: 'stdout' });
          },
          onStderr: (data) => {
            stderrChunks.push(data);
            sseWrite(res, { type: 'command-output', output: data, stream: 'stderr' });
          },
        });

        if (result.exitCode === 0) {
          packagesInstalled.push(...body.packages);
        } else {
          packagesFailed.push(...body.packages);
          errors.push(result.error || stderrChunks.join('\n') || `npm install failed with exit code ${result.exitCode}`);
        }
      }

      const completionAck = {
        status: errors.length > 0 ? 'noop' : 'applied',
        token: randomUUID().replace(/-/g, ''),
        streamVersion: 1,
      };
      const results = {
        packagesInstalled,
        packagesFailed,
        filesCreated,
        filesUpdated,
        commandsExecuted,
        errors,
      };

      sseWrite(res, { type: 'complete', completionAck, results });

      if (idempotencyKey) {
        await this.idempotency.complete(idempotencyKey, { packages: body.packages, completionAck, results }, 86400);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      sseWrite(res, {
        type: 'error',
        message,
      });
      sseWrite(res, {
        type: 'complete',
        completionAck: {
          status: 'noop',
          token: randomUUID().replace(/-/g, ''),
          streamVersion: 1,
        },
        results: {
          packagesInstalled,
          packagesFailed,
          filesCreated,
          filesUpdated,
          commandsExecuted,
          errors,
        },
      });
    } finally {
      sseDone(res);
    }
  }

  @Post('code/component')
  @UseGuards(AuthGuard, ApiKeyGuard)
  async codeComponent(@CurrentUser() user: User, @Body() body: CodeComponentDto) {
    const aiCredentials = await this.fetchUserCredentials(user.id);
    return this.ai.generateComponent(body.section, body.tokens, this.modelResolver.resolveSequence('code_component'), aiCredentials);
  }

  @Post('code/page')
  @UseGuards(AuthGuard, ApiKeyGuard)
  async codePage(@CurrentUser() user: User, @Body() body: CodePageDto) {
    const aiCredentials = await this.fetchUserCredentials(user.id);
    return this.ai.generatePage(body.page, body.sections ?? [], this.modelResolver.resolveSequence('code_page'), aiCredentials);
  }

  @Post('design/tokens')
  @UseGuards(AuthGuard, ApiKeyGuard)
  async designTokens(@CurrentUser() user: User, @Body() body: DesignTokensDto) {
    const aiCredentials = await this.fetchUserCredentials(user.id);
    return this.ai.designTokens(body.spec, this.modelResolver.resolveSequence('design_tokens'), aiCredentials);
  }

  @Post('spec/summarize')
  @UseGuards(AuthGuard, ApiKeyGuard)
  async specSummarize(@CurrentUser() user: User, @Body() body: SummarizeSpecDto) {
    const aiCredentials = await this.fetchUserCredentials(user.id);
    return this.ai.summarizeSpec(body.prompt, this.modelResolver.resolveSequence('spec_summarize'), aiCredentials);
  }

  @Post('spec/ui-ux-blueprint')
  @UseGuards(AuthGuard, ApiKeyGuard)
  async uiUxBlueprint(@CurrentUser() user: User, @Body() body: UiUxBlueprintDto) {
    const aiCredentials = await this.fetchUserCredentials(user.id);
    return this.ai.uiUxBlueprint(body.spec, this.modelResolver.resolveSequence('spec_ui_ux_blueprint'), aiCredentials);
  }

  @Post('project/file-plan')
  @UseGuards(AuthGuard, ApiKeyGuard)
  async filePlan(@CurrentUser() user: User, @Body() body: FilePlanDto) {
    const aiCredentials = await this.fetchUserCredentials(user.id);
    return this.ai.filePlan(body.spec, body.blueprint, this.modelResolver.resolveSequence('file_plan'), aiCredentials);
  }

  @Post('analyze-edit-intent')
  @UseGuards(AuthGuard, ApiKeyGuard)
  async analyzeEditIntent(@CurrentUser() user: User, @Body() body: AnalyzeEditIntentDto) {
    const aiCredentials = await this.fetchUserCredentials(user.id);
    const searchPlan = await this.ai.analyzeEditIntent(
      body.prompt,
      body.manifest,
      this.modelResolver.resolveSequence('analyze_edit_intent'),
      aiCredentials,
    );
    return { success: true, search_plan: searchPlan };
  }

  private async fetchUserCredentials(userId: string): Promise<AiCredential[]> {
    try {
      return await this.providerKeys.resolveCredentials(userId);
    } catch (e) {
      this.logger.warn(`Could not fetch user API credentials: ${e instanceof Error ? e.message : String(e)}`);
      return [];
    }
  }

  private parseFiles(response: string): Array<{ path: string; content: string }> {
    try {
      const parsed = JSON.parse(response);
      const files = Array.isArray(parsed.files) ? parsed.files : [];
      const forbiddenPrefixes = FORBIDDEN_PATH_PREFIXES;
      return files.filter((file: { path?: string }) => {
        const p = file?.path ?? '';
        return !forbiddenPrefixes.some((prefix) => p.startsWith(prefix));
      });
    } catch {
      return [];
    }
  }

  private validateResumeReview(value: unknown):
    | { issues: string[]; todos?: { id: string; content: string; status: string }[] }
    | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const obj = value as Record<string, unknown>;
    if (!Array.isArray(obj.issues) || obj.issues.length === 0) return undefined;
    const issues = obj.issues.filter((i): i is string => typeof i === 'string');
    if (issues.length === 0) return undefined;

    let todos: { id: string; content: string; status: string }[] | undefined;
    if (Array.isArray(obj.todos)) {
      todos = obj.todos
        .filter(
          (t): t is { id: string; content: string; status: string } =>
            typeof t === 'object' &&
            t !== null &&
            typeof (t as Record<string, unknown>).id === 'string' &&
            typeof (t as Record<string, unknown>).content === 'string' &&
            typeof (t as Record<string, unknown>).status === 'string',
        )
        .map((t) => ({
          id: t.id,
          content: t.content,
          status: ['pending', 'in_progress', 'completed'].includes(t.status)
            ? t.status
            : 'pending',
        }));
      if (todos.length === 0) todos = undefined;
    }

    return { issues, todos };
  }

  private validatePrompt(value: unknown): PromptContent | null {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }

    if (Array.isArray(value) && value.length > 0) {
      const parts: PromptPart[] = [];
      for (const item of value) {
        if (
          typeof item === 'object' &&
          item !== null &&
          'type' in item &&
          (item as PromptPart).type === 'text' &&
          'text' in item &&
          typeof (item as TextPromptPart).text === 'string'
        ) {
          parts.push({ type: 'text', text: (item as TextPromptPart).text });
          continue;
        }

        if (
          typeof item === 'object' &&
          item !== null &&
          'type' in item &&
          (item as PromptPart).type === 'image_url' &&
          'image_url' in item &&
          typeof (item as ImagePromptPart).image_url === 'object' &&
          (item as ImagePromptPart).image_url !== null &&
          'url' in (item as ImagePromptPart).image_url &&
          typeof (item as ImagePromptPart).image_url.url === 'string'
        ) {
          const imagePart = item as ImagePromptPart;
          parts.push({
            type: 'image_url',
            image_url: {
              url: imagePart.image_url.url,
              detail: imagePart.image_url.detail,
            },
          });
          continue;
        }

        return null;
      }
      return parts;
    }

    return null;
  }
}
