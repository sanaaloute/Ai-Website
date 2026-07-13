import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class FetchTemplateDto {
  /** Category directory, e.g. `b2b-saas`. */
  @IsString()
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'category must be a lowercase slug (a-z, 0-9, _ and -)',
  })
  category!: string;

  /** Template directory (`07-billing-invoicing`) or catalog id (`b2b-saas-billing-invoicing`). */
  @IsString()
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'template must be a directory name or catalog id',
  })
  template!: string;

  /**
   * `auto`  — use the local templates/ directory when present, else GitHub (default)
   * `local` — force the local templates/ directory
   * `github`— force downloading from the GitHub repo (TEMPLATE_REPO)
   */
  @IsOptional()
  @IsIn(['auto', 'local', 'github'])
  source?: 'auto' | 'local' | 'github';
}
