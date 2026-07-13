import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplateCatalogService } from './template-catalog.service';
import { TemplateFetchService } from './template-fetch.service';

/**
 * User-facing template marketplace: browsable catalog (local `templates/`
 * directory) + on-demand fetch of a single template subdirectory from
 * GitHub (no full-repo clone).
 */
@Module({
  controllers: [TemplatesController],
  providers: [TemplateCatalogService, TemplateFetchService],
  exports: [TemplateCatalogService, TemplateFetchService],
})
export class TemplatesModule {}
