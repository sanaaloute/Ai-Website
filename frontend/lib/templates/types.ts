export type TemplateSectorRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  background_image_url: string;
  sort_order: number;
};

export type TemplatePresetRow = {
  id: string;
  sector_id: string;
  slug: string;
  title: string;
  short_description: string;
  /** Public website URL for screenshot preview. */
  website_url: string;
  /** GitHub repo URL ending in .git (used for Download & Edit with AI). */
  git_repo_url: string;
  /** Pre-fills the builder prompt when user opens the template. */
  suggested_prompt: string;
  /** If true, shown on the landing page "Start from a real website" section. */
  featured?: boolean;
};
