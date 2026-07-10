import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { User } from '@/types';
import { E2BService } from '@/lib/e2b.service';
import { PocketbaseService } from '@/lib/pocketbase.service';

class PrepareDeployDto {
  projectName!: string;
  domain!: string;
  pbSubdomainPrefix?: string;
}

@Controller('api/pocketbase')
export class PocketbaseController {
  constructor(
    private readonly pocketbase: PocketbaseService,
    private readonly e2b: E2BService,
  ) {}

  @Get('template')
  @UseGuards(AuthGuard)
  async getTemplate(@CurrentUser() _user: User, @Query('category') category?: string) {
    const resolvedCategory = category || 'ecommerce';
    const [files, schema, sdkSource] = await Promise.all([
      this.pocketbase.getTemplateFiles(resolvedCategory),
      this.pocketbase.getSchemaDescription(resolvedCategory),
      this.pocketbase.getFrontendSdkSource(resolvedCategory),
    ]);

    return {
      success: true,
      category: resolvedCategory,
      schema,
      sdkSource,
      files,
      fileCount: files.length,
    };
  }

  @Post('prepare-deploy')
  @UseGuards(AuthGuard)
  async prepareDeploy(@CurrentUser() _user: User, @Body() body: PrepareDeployDto) {
    if (!body.projectName || !body.domain) {
      throw new HttpException(
        { success: false, error: 'projectName and domain are required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const deployment = await this.pocketbase.renderDeploymentFiles({
      projectName: body.projectName,
      domain: body.domain,
      pbSubdomainPrefix: body.pbSubdomainPrefix,
    });

    return {
      success: true,
      frontendUrl: deployment.frontendUrl,
      pocketbaseUrl: deployment.pocketbaseUrl,
      adminUrl: deployment.adminUrl,
      adminEmail: deployment.adminEmail,
      adminPassword: deployment.adminPassword,
      files: deployment.files,
      fileCount: deployment.files.length,
    };
  }

  @Get('info')
  @UseGuards(AuthGuard)
  async getPocketbaseInfo(@CurrentUser() _user: User, @Query('sandboxId') sandboxId: string) {
    if (!sandboxId) {
      throw new HttpException(
        { success: false, error: 'sandboxId is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const info = await this.e2b.getPocketbaseInfo(sandboxId);
    if (!info) {
      return {
        success: true,
        url: null,
        adminUrl: null,
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
}
