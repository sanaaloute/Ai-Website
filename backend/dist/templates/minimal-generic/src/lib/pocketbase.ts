import PocketBase, { type RecordModel } from 'pocketbase';

const url = import.meta.env.VITE_POCKETBASE_URL || '/';

export const pb = new PocketBase(url);

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export interface User extends RecordModel {
  email: string;
  name?: string;
  role?: 'customer' | 'admin';
  phone?: string;
  address?: string;
}

export interface Pages extends RecordModel {
  title?: string;
  slug?: string;
  content?: string;
  status?: string;
}

export interface Contacts extends RecordModel {
  user?: string;
  name?: string;
  email?: string;
  message?: string;
  status?: string;
  expand?: { user?: User };
}

export interface StoreSettings extends RecordModel {
  name: string;
  tagline?: string;
  footerText?: string;
}

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------
export async function register(email: string, password: string, name: string) {
  return pb.collection('users').create({
    email,
    password,
    passwordConfirm: password,
    name,
  });
}

export async function login(email: string, password: string) {
  return pb.collection('users').authWithPassword<User>(email, password);
}

export function logout() {
  pb.authStore.clear();
}

export function isAuthenticated() {
  return pb.authStore.isValid;
}

export function currentUser() {
  return pb.authStore.model as User | null;
}

export function isAdmin() {
  return currentUser()?.role === 'admin';
}

// ------------------------------------------------------------------
// Public
// ------------------------------------------------------------------
export async function listPublishedPages(page = 1, perPage = 20) {
  return pb.collection('pages').getList<Pages>(page, perPage, {
    filter: 'status = "published"',
    sort: '-created',
  });
}

// ------------------------------------------------------------------
// Admin helpers
// ------------------------------------------------------------------
export async function listAllPages(
  page = 1,
  perPage = 50,
  options: { search?: string; status?: string } = {}
) {
  const filters: string[] = [];
  if (options.search) {
    filters.push(`(title ~ "${escapeFilter(options.search)}" || slug ~ "${escapeFilter(options.search)}")`);
  }
  if (options.status && options.status !== 'all') {
    filters.push(`status = "${options.status}"`);
  }

  return pb.collection('pages').getList<Pages>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    sort: '-created',
  });
}

export async function createPages(data: Partial<Pages>) {
  return pb.collection('pages').create<Pages>(data);
}

export async function updatePages(id: string, data: Partial<Pages>) {
  return pb.collection('pages').update<Pages>(id, data);
}

export async function deletePages(id: string) {
  return pb.collection('pages').delete(id);
}

export async function listAllContacts(
  page = 1,
  perPage = 50,
  options: { search?: string; status?: string } = {}
) {
  const filters: string[] = [];
  if (options.status && options.status !== 'all') {
    filters.push(`status = "${options.status}"`);
  }
  if (options.search) {
    filters.push(`(name ~ "${escapeFilter(options.search)}" || email ~ "${escapeFilter(options.search)}" || message ~ "${escapeFilter(options.search)}")`);
  }

  return pb.collection('contacts').getList<Contacts>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    expand: 'user',
    sort: '-created',
  });
}

export async function updateContactsStatus(id: string, status: Contacts['status']) {
  return pb.collection('contacts').update<Contacts>(id, { status });
}

export async function deleteContacts(id: string) {
  return pb.collection('contacts').delete(id);
}

export async function listAllUsers(
  page = 1,
  perPage = 50,
  options: { search?: string; role?: User['role'] | 'all' } = {}
) {
  const filters: string[] = [];
  if (options.search) {
    filters.push(`(email ~ "${escapeFilter(options.search)}" || name ~ "${escapeFilter(options.search)}")`);
  }
  if (options.role && options.role !== 'all') {
    filters.push(`role = "${options.role}"`);
  }

  return pb.collection('users').getList<User>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    sort: '-created',
  });
}

export async function updateUserRole(id: string, role: User['role']) {
  return pb.collection('users').update<User>(id, { role });
}

// ------------------------------------------------------------------
// Store settings
// ------------------------------------------------------------------
const SETTINGS_RECORD_ID = 'store';

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    return await pb.collection('settings').getOne<StoreSettings>(SETTINGS_RECORD_ID);
  } catch (err) {
    const defaults: Partial<StoreSettings> = {
      name: 'AI-Website Site',
      tagline: 'Your next great site',
      footerText: '',
    };
    return { id: SETTINGS_RECORD_ID, ...defaults } as StoreSettings;
  }
}

export async function updateStoreSettings(data: Partial<StoreSettings>) {
  try {
    return await pb.collection('settings').update<StoreSettings>(SETTINGS_RECORD_ID, data);
  } catch (err) {
    return await pb.collection('settings').create<StoreSettings>({ id: SETTINGS_RECORD_ID, ...data });
  }
}

// ------------------------------------------------------------------
// File URL helpers
// ------------------------------------------------------------------

/** Build a public PocketBase file URL for a record attachment. */
export function getFileUrl(record: RecordModel, filename: string, options?: { thumb?: string }): string {
  return pb.files.getUrl(record, filename, options);
}

/** Return the first image URL from a file-array field (e.g. images). */
export function getFirstImageUrl(record: RecordModel, fieldName = "images", options?: { thumb?: string }): string {
  const files = (record[fieldName] ?? []) as string[];
  if (!files.length) return "";
  return getFileUrl(record, files[0], options);
}

// Utilities
// ------------------------------------------------------------------
function escapeFilter(value: string) {
  return value.replace(/["\\]/g, '\\$&');
}
