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

export interface Plans extends RecordModel {
  name: string;
  slug: string;
}

export interface Features extends RecordModel {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  status?: string;

}

export interface Subscribers extends RecordModel {
  user?: string;
  email?: string;
  plan?: string;
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
export async function listPublishedFeatures(page = 1, perPage = 20) {
  return pb.collection('features').getList<Features>(page, perPage, {
    filter: 'status = "active"',
    sort: '-created',
  });
}

export async function listAllFeatures(page = 1, perPage = 50, options: { search?: string } = {}) {
  const filters: string[] = [];
  if (options.search) {
    filters.push(`(name ~ "${escapeFilter(options.search)}" || slug ~ "${escapeFilter(options.search)}" || description ~ "${escapeFilter(options.search)}")`);
  }

  return pb.collection('features').getList<Features>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    expand: '',
    sort: '-created',
  });
}

export async function createFeatures(data: Partial<Features>) {
  return pb.collection('features').create<Features>(data);
}

export async function updateFeatures(id: string, data: Partial<Features>) {
  return pb.collection('features').update<Features>(id, data);
}

export async function deleteFeatures(id: string) {
  return pb.collection('features').delete(id);
}

export async function listAllPlans(search?: string) {
  const filter = search ? `(name ~ "${escapeFilter(search)}" || slug ~ "${escapeFilter(search)}")` : undefined;
  return pb.collection('plans').getFullList<Plans>({
    sort: 'name',
    filter,
  });
}

export async function createPlans(data: Partial<Plans>) {
  return pb.collection('plans').create<Plans>(data);
}

export async function updatePlans(id: string, data: Partial<Plans>) {
  return pb.collection('plans').update<Plans>(id, data);
}

export async function deletePlans(id: string) {
  return pb.collection('plans').delete(id);
}

export async function listAllSubscribers(page = 1, perPage = 50, options: { search?: string; status?: string } = {}) {
  const filters: string[] = [];
  if (options.status && options.status !== 'all') {
    filters.push(`status = "${options.status}"`);
  }
  if (options.search) {
    filters.push(`(user.email ~ "${escapeFilter(options.search)}" || email ~ "${escapeFilter(options.search)}")`);
  }

  return pb.collection('subscribers').getList<Subscribers>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    expand: 'user,plan',
    sort: '-created',
  });
}

export async function updateSubscribersStatus(id: string, status: Subscribers['status']) {
  return pb.collection('subscribers').update<Subscribers>(id, { status });
}

export async function deleteSubscribers(id: string) {
  return pb.collection('subscribers').delete(id);
}

export async function listAllUsers(page = 1, perPage = 50, options: { search?: string } = {}) {
  const filters: string[] = [];
  if (options.search) {
    filters.push(`(email ~ "${escapeFilter(options.search)}" || name ~ "${escapeFilter(options.search)}")`);
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
      name: 'AI-Website SaaS',
      tagline: 'Build faster',
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
