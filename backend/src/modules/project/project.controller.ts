import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards,
  Res,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@/common/guards/auth.guard';
import { OptionalAuthGuard } from '@/common/guards/optional-auth.guard';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { User, ProjectSummary } from '@/types';
import { StorageService } from '@/lib/storage.service';
import { IdempotencyService } from '@/lib/idempotency.service';
import { SupabaseService } from '@/lib/supabase.service';
import { E2BService, WORKDIR } from '@/lib/e2b.service';
import { ProjectService } from '@/modules/project/project.service';
import { EntitlementsService } from '@/modules/billing/entitlements.service';
import { env } from '@/config/env';
import JSZip from 'jszip';

@Controller('api')
@UseGuards(AuthGuard)
export class ProjectController {
  private readonly logger = new Logger(ProjectController.name);

  constructor(
    private readonly storage: StorageService,
    private readonly supabase: SupabaseService,
    private readonly e2b: E2BService,
    private readonly idempotency: IdempotencyService,
    private readonly projectService: ProjectService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Get('projects')
  async listProjects(@CurrentUser() user: User) {
    const { data, error } = await this.supabase.admin
      .from('projects')
      .select('id, name, updated_at, vercel_project_id, vercel_domain_url, vercel_deployed_at, github_repo_url')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw new HttpException({ success: false, error: error.message }, HttpStatus.INTERNAL_SERVER_ERROR);

    const projects: ProjectSummary[] = (data ?? []).map((p) => ({
      projectId: p.id,
      projectName: p.name,
      updatedAt: new Date(p.updated_at).getTime(),
      preview: null,
      vercelProjectId: p.vercel_project_id,
      vercelDomainUrl: p.vercel_domain_url,
      vercelDeployedAt: p.vercel_deployed_at,
      githubRepoUrl: p.github_repo_url,
    }));

    return { success: true, projects };
  }

  @Delete('projects')
  async deleteProject(@CurrentUser() user: User, @Body() body: { projectId?: string }) {
    if (!body.projectId) throw new HttpException({ success: false, error: 'projectId required' }, HttpStatus.BAD_REQUEST);
    await this.storage.deleteProjectFiles(user.id, body.projectId);
    const { error } = await this.supabase.admin.from('projects').delete().eq('id', body.projectId).eq('user_id', user.id);
    if (error) throw new HttpException({ success: false, error: error.message }, HttpStatus.INTERNAL_SERVER_ERROR);
    return { success: true, projectId: body.projectId };
  }

  @Patch('projects')
  async renameProject(@CurrentUser() user: User, @Body() body: { projectId?: string; projectName?: string }) {
    if (!body.projectId || !body.projectName?.trim()) {
      throw new HttpException({ success: false, error: 'projectId and projectName required' }, HttpStatus.BAD_REQUEST);
    }
    const trimmedName = body.projectName.trim();
    const { error } = await this.supabase.admin
      .from('projects')
      .update({ name: trimmedName, updated_at: new Date().toISOString() })
      .eq('id', body.projectId)
      .eq('user_id', user.id);
    if (error) throw new HttpException({ success: false, error: error.message }, HttpStatus.INTERNAL_SERVER_ERROR);

    const aiWebsiteResult = await this.projectService.upsertAiWebsiteJson(user.id, body.projectId, {
      project: { name: trimmedName },
    });

    if (!aiWebsiteResult) {
      throw new HttpException(
        { success: false, error: 'Failed to update ai-website.json during rename' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { success: true, projectId: body.projectId, projectName: trimmedName };
  }

  @Post('projects/save')
  async saveProject(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
    return this.idempotency.process(
      idempotencyKey,
      async () => {
        return this.doSaveProject(user, body);
      },
      86400,
    );
  }

  private async doSaveProject(user: User, body: Record<string, unknown>) {
    const projectId = (body.projectId as string) ?? crypto.randomUUID();
    const rawProjectName = (body.projectName as string) ?? '';
    const projectName = rawProjectName.trim();

    // Require a real display name; never accept an empty string or the project's
    // own UUID as the name.
    const isUuid = (value: string): boolean =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    if (!projectName || projectName === projectId || isUuid(projectName)) {
      throw new HttpException(
        { success: false, error: 'A valid project name is required.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const { data: existing } = await this.supabase.admin.from('projects').select('id').eq('id', projectId).single();
    if (existing) {
      await this.supabase.admin
        .from('projects')
        .update({ name: projectName, updated_at: new Date().toISOString() })
        .eq('id', projectId);
    } else {
      // New project — enforce the plan's project limit.
      await this.entitlements.assertCanCreateProject(user.id);
      await this.supabase.admin.from('projects').insert({
        id: projectId,
        user_id: user.id,
        name: projectName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    let sandboxFiles = (body.sandboxFiles as Record<string, string>) ?? {};
    const sandboxId = (body.sandboxId as string) ?? '';
    if (sandboxId) {
      try {
        const fromSandbox = await this.e2b.readFiles(sandboxId, {
          maxFiles: null,
          excludePrefixes: ['node_modules/'],
        });
        sandboxFiles = { ...sandboxFiles, ...fromSandbox.files };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Could not read files from sandbox ${sandboxId} during save: ${message}`);
      }
    }

    // Generate/update the canonical ai-website.json in the stored snapshot.
    // Pass the snapshot we are about to upload so we don't re-download a
    // potentially stale latest.json from storage right after writing it.
    const aiWebsiteResult = await this.projectService.upsertAiWebsiteJson(user.id, projectId, {
      project: {
        uuid: projectId,
        name: projectName,
        siteTitle: (body.siteTitle as string) || projectName,
      },
      snapshot: { ...body, sandboxFiles },
    });

    const updatedSnapshot = aiWebsiteResult?.snapshot ?? { ...body, sandboxFiles };
    const aiWebsiteContent = aiWebsiteResult?.content;

    const forbiddenPrefixes = ['node_modules/'];
    const filteredFiles: Record<string, string> = {};
    const filesToUpload = (updatedSnapshot.sandboxFiles as Record<string, string>) ?? sandboxFiles;
    for (const [path, content] of Object.entries(filesToUpload)) {
      if (forbiddenPrefixes.some((prefix) => path.startsWith(prefix))) continue;
      filteredFiles[path] = content;
    }
    if (aiWebsiteContent) {
      filteredFiles['ai-website.json'] = aiWebsiteContent;
    }

    let uploaded = 0;
    for (const [path, content] of Object.entries(filteredFiles)) {
      const ok = await this.storage.uploadFile(user.id, projectId, path, content);
      if (ok) uploaded++;
    }

    const zip = new JSZip();
    for (const [path, content] of Object.entries(filteredFiles)) {
      zip.file(path, content);
    }
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const zipPath = (await this.storage.snapshotPath(user.id, projectId)).replace('latest.json', 'project.zip');
    await this.storage.uploadZip(user.id, projectId, zipBuffer);

    return {
      success: true,
      projectId,
      projectName,
      savedFiles: Object.keys(filteredFiles).length,
      storageFilesUploaded: uploaded,
      zipPath,
      zipUploaded: true,
      dbSynced: true,
      warnings: [],
    };
  }

  @Post('projects/open')
  async openProject(@CurrentUser() user: User, @Body() body: { projectId?: string; targetSandboxId?: string }) {
    if (!body.projectId || !body.targetSandboxId) {
      throw new HttpException({ success: false, error: 'projectId and targetSandboxId required' }, HttpStatus.BAD_REQUEST);
    }

    const snapshot = await this.storage.downloadLatest(user.id, body.projectId);
    if (!snapshot) {
      throw new HttpException(
        { success: false, error: 'Project snapshot not found in storage. Save the project first.' },
        HttpStatus.NOT_FOUND,
      );
    }

    const sandboxFiles = (snapshot?.sandboxFiles as Record<string, string>) ?? {};
    const forbiddenPrefixes = ['node_modules/'];
    let restored = 0;
    for (const [path, content] of Object.entries(sandboxFiles)) {
      if (forbiddenPrefixes.some((prefix) => path.startsWith(prefix))) continue;
      const ok = await this.e2b.writeFile(body.targetSandboxId, path, content);
      if (ok) restored++;
    }

    const warnings: string[] = [];
    const restoredPaths = Object.keys(sandboxFiles);
    const hasPackageJson = restoredPaths.includes('package.json');

    if (restoredPaths.length > 0 && restored === 0) {
      warnings.push(
        'No project files could be restored. The saved snapshot may be empty or the storage bucket was missing when the project was saved.',
      );
    }

    if (hasPackageJson) {
      const installRes = await this.e2b.runCommand(
        body.targetSandboxId,
        'npm install',
        WORKDIR,
        { timeoutMs: 5 * 60 * 1000 },
      );
      if (installRes.exitCode !== 0) {
        warnings.push(`npm install failed after restore: ${installRes.error || installRes.output}`);
      }
    } else {
      warnings.push('Restored project is missing package.json; preview server may not start.');
    }

    const previewStarted = await this.e2b.restartPreview(body.targetSandboxId);
    if (!previewStarted) {
      warnings.push('Preview server failed to start after restore.');
    }

    return {
      success: true,
      restoreSource: 'storage',
      restoredCount: restored,
      sandboxData: await this.e2b.attach(body.targetSandboxId),
      warnings,
      snapshot,
    };
  }

  @Post('projects/restore-local')
  async restoreLocal(@Body() body: { projectId?: string; sandboxId?: string }) {
    return {
      success: true,
      projectId: body.projectId,
      sandboxId: body.sandboxId,
      restoredCount: 0,
      totalFiles: 0,
      errors: ['Local SQLite fallback not supported in this backend'],
    };
  }

  @Post('create-zip')
  async createZip(@CurrentUser() user: User, @Body() body: { sandboxId?: string; projectId?: string; projectName?: string }) {
    if (!body.projectId) throw new HttpException({ success: false, error: 'projectId required' }, HttpStatus.BAD_REQUEST);
    await this.entitlements.assertFeature(user.id, 'zip_download');
    const signedUrl = await this.storage.getSignedZipUrl(user.id, body.projectId);
    return {
      success: true,
      downloadUrl: signedUrl ?? `${env().appUrl}/api/create-zip?projectId=${body.projectId}`,
      fileName: `${body.projectName ?? 'project'}.zip`,
      message: 'ZIP created successfully',
    };
  }

  @Get('download-repo')
  @UseGuards(OptionalAuthGuard)
  async downloadRepo(@Query('repo_url') repoUrl: string, @Res() res: Response) {
    if (!repoUrl) throw new HttpException({ success: false, error: 'repo_url required' }, HttpStatus.BAD_REQUEST);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=repo.zip');
    res.send(Buffer.from(`stub zip for ${repoUrl}`));
  }
}
