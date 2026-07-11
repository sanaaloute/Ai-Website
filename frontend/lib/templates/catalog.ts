/**
 * Marketing template catalog — shaped like Supabase tables for easy migration.
 * `template_sectors` + `template_presets` (join on sector_id).
 */

export type { TemplateSectorRow, TemplatePresetRow } from "./types";

export {
  SECTOR_ROWS,
  listTemplateSectors,
  getTemplateSectorBySlug,
  listSectorSlugs
} from "./sectors";

export { PRESET_ROWS, listTemplatePresetsBySectorId } from "./presets";
