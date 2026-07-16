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

export interface Listings extends RecordModel {
  name?: string;
  slug?: string;
  make?: string;
  model?: string;
  year?: number;
  price?: number;
  description?: string;
  image?: string;
  status?: string;
  category?: string;
  expand?: { category?: Categories };
}

export interface Inquiries extends RecordModel {
  user?: string;
  listing?: string;
  status?: string;
  message?: string;
  expand?: { user?: User, listing?: Listings };
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
export async function listPublishedListings(page = 1, perPage = 20) {
  return pb.collection('listings').getList<Listings>(page, perPage, {
    filter: 'status = "active"',
    sort: '-created',
  });
}

export async function listAllListings(
  page = 1,
  perPage = 50,
  options: { search?: string; status?: Listings['status'] | 'all'; categoryId?: string } = {}
) {
  const filters: string[] = [];
  if (options.search) {
    filters.push(`(name ~ "${escapeFilter(options.search)}" || slug ~ "${escapeFilter(options.search)}" || make ~ "${escapeFilter(options.search)}" || model ~ "${escapeFilter(options.search)}")`);
  }
  if (options.status && options.status !== 'all') {
    filters.push(`status = "${options.status}"`);
  }
  if (options.categoryId) {
    filters.push(`category = "${options.categoryId}"`);
  }

  return pb.collection('listings').getList<Listings>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    expand: 'category',
    sort: '-created',
  });
}

export async function createListings(data: Partial<Listings>) {
  return pb.collection('listings').create<Listings>(data);
}

export async function updateListings(id: string, data: Partial<Listings>) {
  return pb.collection('listings').update<Listings>(id, data);
}

export async function deleteListings(id: string) {
  return pb.collection('listings').delete(id);
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

export async function listAllInquiries(
  page = 1,
  perPage = 50,
  options: { search?: string; status?: Inquiries['status'] | 'all' } = {}
) {
  const filters: string[] = [];
  if (options.search) {
    filters.push(`(user.email ~ "${escapeFilter(options.search)}" || listing.name ~ "${escapeFilter(options.search)}" || message ~ "${escapeFilter(options.search)}")`);
  }
  if (options.status && options.status !== 'all') {
    filters.push(`status = "${options.status}"`);
  }

  return pb.collection('inquiries').getList<Inquiries>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    expand: 'user,listing',
    sort: '-created',
  });
}

export async function updateInquiriesStatus(id: string, status: Inquiries['status']) {
  return pb.collection('inquiries').update<Inquiries>(id, { status });
}

export async function deleteInquiries(id: string) {
  return pb.collection('inquiries').delete(id);
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
      name: 'AI-Website Automotive',
      tagline: 'Find your next ride',
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
