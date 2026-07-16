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

export interface Jobs extends RecordModel {
  title?: string;
  slug?: string;
  company?: string;
  location?: string;
  salary?: string;
  description?: string;
  status?: string;
  category?: string;
  expand?: { category?: Categories };
}

export interface Applications extends RecordModel {
  user?: string;
  job?: string;
  status?: string;
  coverLetter?: string;
  expand?: { user?: User, job?: Jobs };
}


export interface StoreSettings extends RecordModel {
  name: string;
  tagline?: string;
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
export async function listPublishedJobs(page = 1, perPage = 20) {
  return pb.collection('jobs').getList<Jobs>(page, perPage, {
    filter: 'status = "active"',
    sort: '-created',
  });
}

export async function listAllJobs(
  page = 1,
  perPage = 20,
  options: { search?: string; status?: Jobs['status'] | 'all' } = {}
) {
  const filters: string[] = [];
  if (options.search) {
    filters.push(`(title ~ "${escapeFilter(options.search)}" || slug ~ "${escapeFilter(options.search)}")`);
  }
  if (options.status && options.status !== 'all') {
    filters.push(`status = "${options.status}"`);
  }

  return pb.collection('jobs').getList<Jobs>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    expand: 'category',
    sort: '-created',
  });
}

export async function createJobs(data: Partial<Jobs>) {
  return pb.collection('jobs').create<Jobs>(data);
}

export async function updateJobs(id: string, data: Partial<Jobs>) {
  return pb.collection('jobs').update<Jobs>(id, data);
}

export async function deleteJobs(id: string) {
  return pb.collection('jobs').delete(id);
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

export async function listAllApplications(
  page = 1,
  perPage = 20,
  options: { search?: string } = {}
) {
  const filters: string[] = [];
  if (options.search) {
    filters.push(`(user.email ~ "${escapeFilter(options.search)}" || job.title ~ "${escapeFilter(options.search)}")`);
  }

  return pb.collection('applications').getList<Applications>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    expand: 'user,job',
    sort: '-created',
  });
}

export async function updateApplicationsStatus(id: string, status: Applications['status']) {
  return pb.collection('applications').update<Applications>(id, { status });
}

export async function deleteApplications(id: string) {
  return pb.collection('applications').delete(id);
}

export async function listAllUsers(
  page = 1,
  perPage = 20,
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
  } catch {
    const defaults: Partial<StoreSettings> = {
      name: 'AI-Website Site',
      tagline: 'Built with AI-Website',
      supportEmail: 'support@example.com',
      footerText: '',
    };
    return { id: SETTINGS_RECORD_ID, ...defaults } as StoreSettings;
  }
}

export async function updateStoreSettings(data: Partial<StoreSettings>) {
  try {
    return await pb.collection('settings').update<StoreSettings>(SETTINGS_RECORD_ID, data);
  } catch {
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
