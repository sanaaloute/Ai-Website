export const REMOTE_SNAPSHOT_EMPTY_STRUCTURE = 'No sandbox created yet';

/** True when `value` is a canonical UUID string (matches `projects.id` in Supabase). */
export function isUuidProjectId(value: string | null | undefined): boolean {
  const v = (value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
