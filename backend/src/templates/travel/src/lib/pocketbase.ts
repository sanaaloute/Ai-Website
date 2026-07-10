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

export interface Tours extends RecordModel {
  name?: string;
  slug?: string;
  destination?: string;
  duration?: string;
  price?: number;
  description?: string;
  image?: string;
  status?: string;
  category?: string;
  expand?: { category?: Categories };
}

export interface Bookings extends RecordModel {
  user?: string;
  tour?: string;
  status?: string;
  notes?: string;
  expand?: { user?: User, tour?: Tours };
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
export async function listPublishedTours(page = 1, perPage = 20) {
  return pb.collection('tours').getList<Tours>(page, perPage, {
    filter: 'status = "active"',
    sort: '-created',
  });
}

export async function listAllTours(page = 1, perPage = 50, options: { search?: string } = {}) {
  const filters: string[] = [];
  if (options.search) {
    filters.push(`(name ~ "${escapeFilter(options.search)}" || slug ~ "${escapeFilter(options.search)}" || destination ~ "${escapeFilter(options.search)}" || description ~ "${escapeFilter(options.search)}")`);
  }

  return pb.collection('tours').getList<Tours>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    expand: 'category',
    sort: '-created',
  });
}

export async function createTours(data: Partial<Tours>) {
  return pb.collection('tours').create<Tours>(data);
}

export async function updateTours(id: string, data: Partial<Tours>) {
  return pb.collection('tours').update<Tours>(id, data);
}

export async function deleteTours(id: string) {
  return pb.collection('tours').delete(id);
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

export async function listAllBookings(page = 1, perPage = 50, options: { search?: string; status?: string } = {}) {
  const filters: string[] = [];
  if (options.status && options.status !== 'all') {
    filters.push(`status = "${options.status}"`);
  }
  if (options.search) {
    filters.push(`(user.email ~ "${escapeFilter(options.search)}" || tour.name ~ "${escapeFilter(options.search)}" || notes ~ "${escapeFilter(options.search)}")`);
  }

  return pb.collection('bookings').getList<Bookings>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    expand: 'user,tour',
    sort: '-created',
  });
}

export async function updateBookingsStatus(id: string, status: Bookings['status']) {
  return pb.collection('bookings').update<Bookings>(id, { status });
}

export async function deleteBookings(id: string) {
  return pb.collection('bookings').delete(id);
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
      name: 'LoveCode Travel',
      tagline: 'Explore the world',
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
