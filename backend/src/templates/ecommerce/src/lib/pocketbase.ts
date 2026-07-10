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

export interface Category extends RecordModel {
  name: string;
  slug: string;
  image?: string;
}

export interface Product extends RecordModel {
  name: string;
  slug: string;
  price: number;
  stock: number;
  description?: string;
  images?: string[];
  category?: string;
  status: 'active' | 'draft' | 'archived';
  expand?: { category?: Category };
}

export interface OrderItem {
  product: string;
  name: string;
  qty: number;
  price: number;
}

export interface Order extends RecordModel {
  user: string;
  status: 'pending' | 'paid' | 'shipped' | 'cancelled';
  total: number;
  stripe_payment_intent_id?: string;
  items: OrderItem[];
  expand?: { user?: User };
}

export interface Review extends RecordModel {
  product: string;
  user: string;
  rating: number;
  comment?: string;
  expand?: { product?: Product; user?: User };
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
// Categories (public)
// ------------------------------------------------------------------
export async function listCategories(search?: string) {
  const filter = search ? `name ~ "${escapeFilter(search)}"` : '';
  return pb.collection('categories').getFullList<Category>({
    sort: 'name',
    filter: filter || undefined,
  });
}

// ------------------------------------------------------------------
// Products (public)
// ------------------------------------------------------------------
export async function listProducts(
  page = 1,
  perPage = 20,
  options: { categorySlug?: string; search?: string; status?: Product['status'] } = {}
) {
  const filters: string[] = ['status = "active"'];
  if (options.categorySlug) filters.push(`category.slug = "${options.categorySlug}"`);
  if (options.search) filters.push(`(name ~ "${escapeFilter(options.search)}" || description ~ "${escapeFilter(options.search)}")`);
  if (options.status) filters.push(`status = "${options.status}"`);

  return pb.collection('products').getList<Product>(page, perPage, {
    filter: filters.join(' && '),
    expand: 'category',
    sort: '-created',
  });
}

export async function getProductBySlug(slug: string) {
  return pb.collection('products').getFirstListItem<Product>(`slug = "${slug}" && status = "active"`, {
    expand: 'category',
  });
}

// ------------------------------------------------------------------
// File uploads
// ------------------------------------------------------------------
export async function uploadProductImage(productId: string, file: File) {
  const formData = new FormData();
  formData.append('images', file);
  return pb.collection('products').update<Product>(productId, formData);
}

export async function uploadCategoryImage(categoryId: string, file: File) {
  const formData = new FormData();
  formData.append('image', file);
  return pb.collection('categories').update<Category>(categoryId, formData);
}

// ------------------------------------------------------------------
// Orders (customer)
// ------------------------------------------------------------------
export async function createOrder(items: OrderItem[], total: number) {
  if (!pb.authStore.isValid) throw new Error('You must be logged in to place an order');

  return pb.collection('orders').create<Order>({
    user: pb.authStore.model?.id,
    status: 'pending',
    total,
    items,
  });
}

export async function updateOrderPayment(orderId: string, paymentIntentId: string) {
  return pb.collection('orders').update<Order>(orderId, {
    status: 'paid',
    stripe_payment_intent_id: paymentIntentId,
  });
}

export async function listMyOrders() {
  if (!pb.authStore.isValid) throw new Error('Not authenticated');
  return pb.collection('orders').getFullList<Order>({
    filter: `user = "${pb.authStore.model?.id}"`,
    sort: '-created',
  });
}

// ------------------------------------------------------------------
// Reviews (public / customer)
// ------------------------------------------------------------------
export async function listProductReviews(productId: string) {
  return pb.collection('reviews').getFullList<Review>({
    filter: `product = "${productId}"`,
    expand: 'user',
    sort: '-created',
  });
}

export async function createReview(productId: string, rating: number, comment?: string) {
  if (!pb.authStore.isValid) throw new Error('Not authenticated');
  return pb.collection('reviews').create<Review>({
    product: productId,
    user: pb.authStore.model?.id,
    rating,
    comment,
  });
}

// ------------------------------------------------------------------
// Admin helpers
// ------------------------------------------------------------------
export async function listAllProducts(
  page = 1,
  perPage = 50,
  options: { search?: string; status?: Product['status'] | 'all'; categoryId?: string; sort?: string } = {}
) {
  const filters: string[] = [];
  if (options.search) {
    filters.push(`(name ~ "${escapeFilter(options.search)}" || slug ~ "${escapeFilter(options.search)}")`);
  }
  if (options.status && options.status !== 'all') {
    filters.push(`status = "${options.status}"`);
  }
  if (options.categoryId) {
    filters.push(`category = "${options.categoryId}"`);
  }

  return pb.collection('products').getList<Product>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    expand: 'category',
    sort: options.sort || '-created',
  });
}

export async function createProduct(data: Partial<Product>) {
  return pb.collection('products').create<Product>(data);
}

export async function updateProduct(id: string, data: Partial<Product>) {
  return pb.collection('products').update<Product>(id, data);
}

export async function deleteProduct(id: string) {
  return pb.collection('products').delete(id);
}

export async function listAllCategories(search?: string) {
  const filter = search ? `name ~ "${escapeFilter(search)}"` : undefined;
  return pb.collection('categories').getFullList<Category>({
    sort: 'name',
    filter,
  });
}

export async function createCategory(data: Partial<Category>) {
  return pb.collection('categories').create<Category>(data);
}

export async function updateCategory(id: string, data: Partial<Category>) {
  return pb.collection('categories').update<Category>(id, data);
}

export async function deleteCategory(id: string) {
  return pb.collection('categories').delete(id);
}

export async function listAllOrders(
  page = 1,
  perPage = 50,
  options: { status?: Order['status'] | 'all'; search?: string } = {}
) {
  const filters: string[] = [];
  if (options.status && options.status !== 'all') {
    filters.push(`status = "${options.status}"`);
  }
  if (options.search) {
    filters.push(`(user.email ~ "${escapeFilter(options.search)}" || id ~ "${escapeFilter(options.search)}")`);
  }

  return pb.collection('orders').getList<Order>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    expand: 'user',
    sort: '-created',
  });
}

export async function updateOrderStatus(id: string, status: Order['status']) {
  return pb.collection('orders').update<Order>(id, { status });
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

export async function listAllReviews(
  page = 1,
  perPage = 50,
  options: { search?: string } = {}
) {
  const filters: string[] = [];
  if (options.search) {
    filters.push(
      `(product.name ~ "${escapeFilter(options.search)}" || user.email ~ "${escapeFilter(options.search)}" || comment ~ "${escapeFilter(options.search)}")`
    );
  }

  return pb.collection('reviews').getList<Review>(page, perPage, {
    filter: filters.join(' && ') || undefined,
    expand: 'product,user',
    sort: '-created',
  });
}

export async function deleteReview(id: string) {
  return pb.collection('reviews').delete(id);
}

// ------------------------------------------------------------------
// Store settings
// ------------------------------------------------------------------
const SETTINGS_RECORD_ID = 'store';

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    return await pb.collection('settings').getOne<StoreSettings>(SETTINGS_RECORD_ID);
  } catch (err) {
    // If the record does not exist, return defaults so the UI never breaks.
    const defaults: Partial<StoreSettings> = {
      name: 'LoveCode Shop',
      tagline: 'Built with LoveCode',
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
    // If the record does not exist, create it.
    return await pb.collection('settings').create<StoreSettings>({ id: SETTINGS_RECORD_ID, ...data });
  }
}

// ------------------------------------------------------------------
// Real-time subscriptions
// ------------------------------------------------------------------
export function subscribeProductStock(productId: string, callback: (data: Product) => void) {
  return pb.collection('products').subscribe<Product>(productId, (e) => {
    callback(e.record);
  });
}

export function unsubscribe(subscription: ReturnType<typeof subscribeProductStock>) {
  return subscription.then((unsub) => unsub?.());
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
