import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  UseGuards,
  Res,
  Logger,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { OptionalAuthGuard } from '@/common/guards/optional-auth.guard';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { User } from '@/types';
import {
  E2BService,
  SandboxNotFoundError,
  SandboxGoneError,
  E2BProviderError,
} from '@/lib/e2b.service';
import { StorageService } from '@/lib/storage.service';
import { IdempotencyService } from '@/lib/idempotency.service';
import { EntitlementsService } from '@/modules/billing/entitlements.service';

const WORKDIR = '/home/user/app';

function sseInit(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write('retry: 3000\n\n');
}

function sseWrite(res: Response, payload: Record<string, unknown>) {
  if (res.writableEnded) return;
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  (res as unknown as { flush?: () => void }).flush?.();
}

function sseDone(res: Response) {
  if (!res.writableEnded) {
    res.write(`data: {"type":"done"}\n\n`);
    res.end();
  }
}

@Controller('api')
export class SandboxController {
  private readonly logger = new Logger(SandboxController.name);

  constructor(
    private readonly e2b: E2BService,
    private readonly storage: StorageService,
    private readonly idempotency: IdempotencyService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Post('create-ai-sandbox-v2')
  @UseGuards(OptionalAuthGuard)
  async createAiSandbox(
    @CurrentUser() user: User | undefined,
    @Body() body: { projectName?: string; skipSetup?: boolean; idempotencyKey?: string },
  ) {
    // Authenticated users are subject to their plan's monthly sandbox hours.
    if (user?.id) {
      await this.entitlements.assertSandboxTimeAvailable(user.id);
    }
    return this.idempotency.process(
      body.idempotencyKey ?? '',
      async () => {
        const data = await this.e2b.createSandbox({ skipSetup: body.skipSetup, userId: user?.id });
        return { success: true, ...data };
      },
      3600,
    );
  }

  @Post('kill-sandbox')
  @UseGuards(OptionalAuthGuard)
  async killSandbox(@Body() body: { sandboxId?: string }) {
    if (!body.sandboxId) throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);
    const killed = await this.e2b.kill(body.sandboxId);
    return { success: true, sandboxKilled: killed };
  }

  @Post('sandbox-renew')
  @UseGuards(OptionalAuthGuard)
  async sandboxRenew(@Body() body: { sandboxId?: string }) {
    if (!body.sandboxId) throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);

    try {
      const data = await this.e2b.renewSandbox(body.sandboxId);
      return {
        success: true,
        oldSandboxId: body.sandboxId,
        newSandboxId: data.sandboxId,
        url: data.url,
        createdAt: data.createdAt,
        endAt: data.endAt,
        filesMigrated: data.filesMigrated,
        sourceGone: data.sourceGone ?? false,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Sandbox renewal failed for ${body.sandboxId}: ${message}`);
      throw new HttpException(
        { success: false, error: `Renewal failed: ${message}`, oldSandboxId: body.sandboxId },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('sandbox-status')
  @UseGuards(OptionalAuthGuard)
  async sandboxStatus(@Query('sandboxId') sandboxId: string) {
    if (!sandboxId) throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);
    try {
      const data = await this.e2b.attach(sandboxId);
      return { success: true, active: true, healthy: true, sandboxData: data };
    } catch (err) {
      if (err instanceof SandboxNotFoundError || err instanceof SandboxGoneError || err instanceof E2BProviderError) {
        this.logger.warn(`Sandbox ${sandboxId} is unreachable: ${err.message}`);
        return {
          success: true,
          active: false,
          healthy: false,
          reason: err.message,
          sandboxData: null,
        };
      }
      throw err;
    }
  }

  @Get('sandbox-logs')
  @UseGuards(OptionalAuthGuard)
  async sandboxLogs(@Query('sandboxId') sandboxId: string) {
    if (!sandboxId) throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);
    const cmd = await this.e2b.runCommand(sandboxId, `tail -n 50 /tmp/vite.log 2>/dev/null || echo "No logs yet"`);
    return { success: true, logs: cmd.output.split('\n'), status: cmd.exitCode === 0 ? 'running' : 'stopped' };
  }

  @Get('sandbox-snapshot')
  @UseGuards(AuthGuard)
  async getSandboxSnapshot(
    @CurrentUser() user: User,
    @Query('projectId') projectId: string,
    @Query('sandboxId') sandboxId: string,
  ) {
    if (!projectId || !sandboxId) throw new HttpException({ success: false, error: 'projectId and sandboxId required' }, HttpStatus.BAD_REQUEST);
    const snapshot = await this.storage.downloadLatest(user.id, projectId);
    return {
      success: true,
      snapshot: snapshot ?? { projectId, sandboxId, fileStructure: '', sandboxFiles: {} },
    };
  }

  @Post('sandbox-snapshot')
  @UseGuards(AuthGuard)
  async saveSandboxSnapshot(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    const projectId = body.projectId as string;
    if (!projectId) throw new HttpException({ success: false, error: 'projectId required' }, HttpStatus.BAD_REQUEST);
    const path = await this.storage.uploadLatest(user.id, projectId, body);
    return { success: true, snapshot: body, path };
  }

  @Post('restart-preview')
  @UseGuards(OptionalAuthGuard)
  async restartPreview(@Body() body: { sandboxId?: string }) {
    if (!body.sandboxId) throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);
    const ok = await this.e2b.restartPreview(body.sandboxId);
    return { success: ok, message: ok ? 'Preview server restarted' : 'Failed to restart preview' };
  }

  @Post('run-command-v2')
  @UseGuards(OptionalAuthGuard)
  async runCommand(@Body() body: { sandboxId?: string; command?: string }) {
    if (!body.sandboxId || !body.command) {
      throw new HttpException({ success: false, error: 'sandboxId and command required' }, HttpStatus.BAD_REQUEST);
    }
    const result = await this.e2b.runCommand(body.sandboxId, body.command);
    return {
      success: result.exitCode === 0,
      output: result.output,
      error: result.error,
      exitCode: result.exitCode,
      message: result.exitCode === 0 ? 'Command executed successfully' : 'Command failed',
    };
  }

  @Get('sandbox-file')
  @UseGuards(OptionalAuthGuard)
  async getSandboxFile(@Query('sandboxId') sandboxId: string, @Query('path') filePath: string) {
    if (!sandboxId || !filePath) {
      throw new HttpException({ success: false, error: 'sandboxId and path required' }, HttpStatus.BAD_REQUEST);
    }
    const content = await this.e2b.readFile(sandboxId, filePath);
    return { success: true, path: filePath, content };
  }

  @Post('sandbox-file')
  @UseGuards(OptionalAuthGuard)
  async writeSandboxFile(@Body() body: { sandboxId?: string; path?: string; content?: string }) {
    if (!body.sandboxId || !body.path || body.content === undefined) {
      throw new HttpException(
        { success: false, error: 'sandboxId, path, and content required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const ok = await this.e2b.writeFile(body.sandboxId, body.path, body.content);
    return { success: ok, path: body.path };
  }

  @Patch('sandbox-file')
  @UseGuards(OptionalAuthGuard)
  async renameSandboxFile(@Body() body: { sandboxId?: string; path?: string; newPath?: string }) {
    if (!body.sandboxId || !body.path || !body.newPath) {
      throw new HttpException(
        { success: false, error: 'sandboxId, path, and newPath required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const ok = await this.e2b.renameFile(body.sandboxId, body.path, body.newPath);
    return { success: ok, oldPath: body.path, newPath: body.newPath };
  }

  @Delete('sandbox-file')
  @UseGuards(OptionalAuthGuard)
  async deleteSandboxFile(@Query('sandboxId') sandboxId: string, @Query('path') filePath: string) {
    if (!sandboxId || !filePath) {
      throw new HttpException({ success: false, error: 'sandboxId and path required' }, HttpStatus.BAD_REQUEST);
    }
    const ok = await this.e2b.deleteFile(sandboxId, filePath);
    return { success: ok, path: filePath };
  }

  @Post('install-packages-v2')
  @UseGuards(OptionalAuthGuard)
  async installPackages(@Body() body: { sandboxId?: string; packages?: string[] }, @Res({ passthrough: false }) res: Response) {
    if (!body.sandboxId) throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);
    const packages = body.packages ?? [];

    sseInit(res);
    res.req.on('close', () => {
      if (!res.writableEnded) res.end();
    });

    const packagesInstalled: string[] = [];
    const packagesFailed: string[] = [];

    try {
      sseWrite(res, { type: 'start', packages });
      sseWrite(res, { type: 'status', message: `Installing ${packages.length} packages...` });

      if (packages.length) {
        const command = `npm install ${packages.join(' ')}`;
        sseWrite(res, { type: 'command', command });

        const stdoutChunks: string[] = [];
        const stderrChunks: string[] = [];

        const result = await this.e2b.runCommand(body.sandboxId, command, WORKDIR, {
          timeoutMs: 10 * 60 * 1000,
          onStdout: (data) => {
            stdoutChunks.push(data);
            sseWrite(res, { type: 'command-output', output: data, stream: 'stdout' });

            // Heuristic: npm logs package names when it resolves/adds them.
            // Emit incremental progress so the UI feels alive.
            const resolvedPackage = data.match(/^(?:\+|--\s)(@?[^\s@]+@[^\s]+)/)?.[1];
            if (resolvedPackage && !packagesInstalled.includes(resolvedPackage)) {
              packagesInstalled.push(resolvedPackage);
              sseWrite(res, { type: 'package-progress', installedPackages: [...packagesInstalled] });
            }
          },
          onStderr: (data) => {
            stderrChunks.push(data);
            sseWrite(res, { type: 'command-output', output: data, stream: 'stderr' });
          },
        });

        sseWrite(res, { type: 'command-complete', success: result.exitCode === 0, exitCode: result.exitCode });

        if (result.exitCode === 0) {
          // Fallback: if heuristic caught nothing, mark requested packages as installed.
          if (packagesInstalled.length === 0) {
            packagesInstalled.push(...packages);
          }
          for (const pkg of packages) {
            sseWrite(res, { type: 'success', package: pkg, exitCode: result.exitCode });
          }
          sseWrite(res, { type: 'package-progress', installedPackages: [...packagesInstalled] });
        } else {
          for (const pkg of packages) {
            packagesFailed.push(pkg);
            sseWrite(res, { type: 'error', package: pkg, message: stderrChunks.join('\n') || `npm install failed with exit code ${result.exitCode}` });
          }
        }
      }

      sseWrite(res, {
        type: 'complete',
        results: {
          packagesInstalled,
          packagesFailed,
        },
        appliedFiles: [],
        analyzerDone: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      for (const pkg of packages) {
        packagesFailed.push(pkg);
      }
      sseWrite(res, { type: 'error', message });
      sseWrite(res, {
        type: 'complete',
        results: {
          packagesInstalled,
          packagesFailed,
        },
        appliedFiles: [],
        analyzerDone: true,
        error: message,
      });
    } finally {
      sseDone(res);
    }
  }

  @Get('get-sandbox-files')
  @UseGuards(OptionalAuthGuard)
  async getSandboxFiles(@Query('sandboxId') sandboxId: string, @Query('maxFiles') maxFiles?: string) {
    if (!sandboxId) throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);
    const parsedMax = maxFiles === undefined ? undefined : maxFiles === 'null' ? null : parseInt(maxFiles, 10);
    const data = await this.e2b.readFiles(sandboxId, { maxFiles: parsedMax });
    return { success: true, ...data };
  }

  @Get('get-sandbox-files-binary')
  @UseGuards(AuthGuard)
  async getSandboxFilesBinary(@Query('sandboxId') sandboxId: string) {
    if (!sandboxId) throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);
    const data = await this.e2b.readFiles(sandboxId);
    const encoded: Record<string, string> = {};
    for (const [path, content] of Object.entries(data.files)) {
      encoded[path] = Buffer.from(content).toString('base64');
    }
    return { success: true, files: encoded, fileCount: Object.keys(encoded).length };
  }

  @Get('get-sandbox-pocketbase-info')
  @UseGuards(AuthGuard)
  async getSandboxPocketbaseInfo(@Query('sandboxId') sandboxId: string) {
    if (!sandboxId) throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);
    const info = await this.e2b.getPocketbaseInfo(sandboxId);
    if (!info) {
      return {
        success: true,
        url: null,
        adminEmail: null,
        adminPassword: null,
        message: 'PocketBase is not running in this sandbox',
      };
    }
    return {
      success: true,
      url: info.url,
      adminUrl: `${info.url}/_/`,
      adminEmail: info.adminEmail,
      adminPassword: info.adminPassword,
    };
  }

  @Post('preview-health')
  @UseGuards(OptionalAuthGuard)
  async previewHealth(@Body() body: { sandboxId?: string; previewUrl?: string; timeoutMs?: number }) {
    if (!body.sandboxId) throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);
    const previewUrl = body.previewUrl ?? (await this.e2b.getPreviewUrl(body.sandboxId));
    const health = await this.e2b.previewHealth(previewUrl);
    return {
      success: true,
      active: health.reachable,
      reachable: health.reachable,
      sandboxId: body.sandboxId,
      previewUrl: body.previewUrl,
      statusCode: health.statusCode ?? 0,
      diagnostics: {},
      reason: null,
    };
  }

  @Get('monitor-preview-logs')
  @UseGuards(OptionalAuthGuard)
  async monitorPreviewLogs(@Query('sandboxId') sandboxId: string) {
    if (!sandboxId) throw new HttpException({ success: false, error: 'sandboxId required' }, HttpStatus.BAD_REQUEST);
    const cmd = await this.e2b.runCommand(sandboxId, 'cat /tmp/next.log /tmp/vite.log 2>/dev/null || echo ""');
    const errors: Array<Record<string, string>> = [];
    const missing = cmd.output.match(/Cannot find module '([^']+)'/g);
    if (missing) {
      for (const m of missing) {
        const pkg = m.match(/'([^']+)'/)?.[1] ?? '';
        errors.push({ type: 'missing_import', package: pkg, message: `Cannot find module '${pkg}'`, file: '' });
      }
    }
    return { success: true, hasErrors: errors.length > 0, errors };
  }

  @Post('report-preview-error')
  reportPreviewError(@Body() body: { error?: string; file?: string; type?: string; sandboxId?: string }) {
    this.logger.warn(`Preview error [${body.sandboxId}]: ${body.type} - ${body.error} (${body.file})`);
    return {
      success: true,
      error: { type: body.type ?? 'unknown', message: body.error ?? '', file: body.file ?? '', timestamp: new Date().toISOString() },
    };
  }

  @Get('check-preview-errors')
  checkPreviewErrors() {
    return { success: true, hasErrors: false, errors: [], storage: 'none' };
  }

  @Post('preview-inline-text')
  @UseGuards(AuthGuard)
  async previewInlineText(
    @Body() body: { sandboxId?: string; relativePath?: string; lineNumber?: number; oldText?: string; newText?: string },
  ) {
    if (!body.sandboxId || !body.relativePath) {
      throw new HttpException({ success: false, error: 'sandboxId and relativePath required' }, HttpStatus.BAD_REQUEST);
    }
    const files = await this.e2b.readFiles(body.sandboxId);
    let content = files.files[body.relativePath] ?? '';
    if (body.oldText && body.newText !== undefined) {
      content = content.replace(body.oldText, body.newText);
      await this.e2b.writeFile(body.sandboxId, body.relativePath, content);
    }
    return { success: true, path: body.relativePath };
  }

  @Get('get-sandbox-file')
  @UseGuards(OptionalAuthGuard)
  async getSandboxFileLegacy(@Query('sandboxId') sandboxId: string, @Query('path') path: string) {
    if (!sandboxId || !path) {
      throw new HttpException({ success: false, error: 'sandboxId and path required' }, HttpStatus.BAD_REQUEST);
    }
    const content = await this.e2b.readFile(sandboxId, path);
    if (content === null) {
      throw new HttpException({ success: false, error: 'File not found' }, HttpStatus.NOT_FOUND);
    }
    return { success: true, path, content };
  }

  @Post('sandbox-snapshot/restore')
  @UseGuards(OptionalAuthGuard)
  async restoreSandboxSnapshot(
    @Body() body: { sandboxId?: string; snapshotId?: string },
  ) {
    if (!body.sandboxId || !body.snapshotId) {
      throw new HttpException(
        { success: false, error: 'sandboxId and snapshotId required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const restored = await this.e2b.restoreSandboxSnapshot(body.sandboxId, body.snapshotId);
    return { success: restored };
  }
}
