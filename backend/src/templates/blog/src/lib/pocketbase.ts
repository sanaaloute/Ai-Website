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

export interface Categories extends RecordModel {
  name: string;
  slug: string;
}

export interface Posts extends RecordModel {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  image?: string;
  status?: string;
  category?: string;
  expand?: { category?: Categories };
}

export interface Comments extends RecordModel {
  user?: string;
  post?: string;
  body?: string;
  status?: string;
  expand?: { user?: User, post?: Posts };
}

export interface StoreSettings extends RecordModel {
  name: string;
  tagline?: string;
  currency: string;
  supportEmail?: string;
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
export async function listPublishedPosts(page = 1, perPage = 20) {
  return pb.collection('posts').getList<Posts>(page, perPage, {
    filter: 'status = "published"',
    sort: '-created',
  });
}

export async function listAllPosts(
  page = 1,
  perPage = 50,
  options: { search?: string; status?: Posts['status'] | 'all'; categoryId?: string } = {}
) {
  const filters: string[] = [];
  if (options.search) {
    filters.push(`(title ~ "${escapeFilter(options.search)}" || slug ~ "${escapeFilter(options.search)}" || excerpt ~ "${escapeFilter(options.search)}")`);
  }
  if (options.status && options.status !== 'all') {
    filters.push(`status = "${options.status}"`);
  }
  if (options.categoryId) {
    filters.push(`category = "${options.categoryId}"`);
  }

  return pb.collection('posts').getList<Posts>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    expand: 'category',
    sort: '-created',
  });
}

export async function createPosts(data: Partial<Posts>) {
  return pb.collection('posts').create<Posts>(data);
}

export async function updatePosts(id: string, data: Partial<Posts>) {
  return pb.collection('posts').update<Posts>(id, data);
}

export async function deletePosts(id: string) {
  return pb.collection('posts').delete(id);
}

export async function listAllCategories(search?: string) {
  const filter = search ? `name ~ "${escapeFilter(search)}"` : undefined;
  return pb.collection('categories').getFullList<Categories>({
    sort: 'name',
    filter,
  });
}

export async function createCategories(data: Partial<Categories>) {
  return pb.collection('categories').create<Categories>(data);
}

export async function updateCategories(id: string, data: Partial<Categories>) {
  return pb.collection('categories').update<Categories>(id, data);
}

export async function deleteCategories(id: string) {
  return pb.collection('categories').delete(id);
}

export async function listAllComments(
  page = 1,
  perPage = 50,
  options: { search?: string; status?: Comments['status'] | 'all' } = {}
) {
  const filters: string[] = [];
  if (options.search) {
    filters.push(`(user.email ~ "${escapeFilter(options.search)}" || post.title ~ "${escapeFilter(options.search)}" || body ~ "${escapeFilter(options.search)}")`);
  }
  if (options.status && options.status !== 'all') {
    filters.push(`status = "${options.status}"`);
  }

  return pb.collection('comments').getList<Comments>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    expand: 'user,post',
    sort: '-created',
  });
}

export async function updateCommentsStatus(id: string, status: Comments['status']) {
  return pb.collection('comments').update<Comments>(id, { status });
}

export async function deleteComments(id: string) {
  return pb.collection('comments').delete(id);
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
      name: 'LoveCode Blog',
      tagline: 'Stories and ideas',
      currency: 'USD',
      supportEmail: 'support@example.com',
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
