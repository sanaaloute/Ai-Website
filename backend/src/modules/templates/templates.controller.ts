import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@/common/guards/auth.guard';
import { TemplateCatalogService } from './template-catalog.service';
import { TemplateFetchService } from './template-fetch.service';
import { FetchTemplateDto } from './dto/fetch-template.dto';

/**
 * Template marketplace API.
 *
 * GET endpoints are public (template metadata is not sensitive).
 * POST fetch requires authentication — it materializes a template's files
 * from the local catalog or from GitHub.
 */
@Controller('api/templates')
export class TemplatesController {
  private readonly logger = new Logger(TemplatesController.name);

  constructor(
    private readonly catalog: TemplateCatalogService,
    private readonly fetcher: TemplateFetchService,
  ) {}

  /** List all template categories with their templates. */
  @Get()
  async listCategories() {
    const categories = await this.catalog.listCategories();
    return { success: true, categories };
  }

  /** One category catalog (`templates/<category>/index.json`). */
  @Get(':category')
  async getCategory(@Param('category') category: string) {
    const catalog = await this.catalog.getCategory(category);
    if (!catalog) {
      throw new HttpException(
        { success: false, error: `Unknown template category "${category}"` },
        HttpStatus.NOT_FOUND,
      );
    }
    return { success: true, catalog };
  }

  /** Metadata for a single template (accepts directory name or catalog id). */
  @Get(':category/:template')
  async getTemplate(
    @Param('category') category: string,
    @Param('template') template: string,
  ) {
    const entry = await this.catalog.findTemplate(category, template);
    if (!entry) {
      throw new HttpException(
        { success: false, error: `Unknown template "${template}" in category "${category}"` },
        HttpStatus.NOT_FOUND,
      );
    }
    const meta = await this.catalog.getTemplateMeta(category, entry.path);
    return { success: true, template: meta ?? entry };
  }

  /**
   * Fetch a template's files (source: local catalog or GitHub).
   * Returns `{ relativePath: content }` ready to be written into a project
   * workspace or uploaded into a sandbox.
   */
  @Post('fetch')
  @UseGuards(AuthGuard)
  async fetchTemplate(@Body() dto: FetchTemplateDto) {
    const source = dto.source ?? 'auto';
    const entry = await this.catalog.findTemplate(dto.category, dto.template);
    if (!entry && source !== 'github') {
      throw new HttpException(
        { success: false, error: `Unknown template "${dto.template}" in category "${dto.category}"` },
        HttpStatus.NOT_FOUND,
      );
    }

    const templatePath = entry ? entry.path : dto.template;

    if (source === 'auto' || source === 'local') {
      const files = await this.catalog.getLocalTemplateFiles(dto.category, templatePath);
      if (files) {
        return {
          success: true,
          category: dto.category,
          template: entry?.id ?? dto.template,
          source: 'local',
          fileCount: Object.keys(files).length,
          files,
        };
      }
      if (source === 'local') {
        throw new HttpException(
          { success: false, error: 'Local templates directory is not available' },
          HttpStatus.NOT_FOUND,
        );
      }
    }

    // source === 'github', or 'auto' with no local catalog
    const repoPath = `templates/${dto.category}/${templatePath}`;
    const files = await this.fetcher.fetchTemplate(repoPath);
    return {
      success: true,
      category: dto.category,
      template: entry?.id ?? dto.template,
      source: 'github',
      fileCount: Object.keys(files).length,
      files,
    };
  }
}
