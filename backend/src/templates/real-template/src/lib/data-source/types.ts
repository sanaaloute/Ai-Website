/**
 * Data Source Types
 *
 * Abstract interfaces for all data operations. These decouple the API routes
 * from any specific backend (Prisma/SQLite, Supabase, or external API Gateway).
 */

/* ------------------------------------------------------------------ */
// Entity Types
/* ------------------------------------------------------------------ */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  specs: string | null;
  version: string;
  isAvailable: boolean;
  orderCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface User {
  id: string;
  email: string;
  password: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  role: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CartItem {
  id: string;
  userId: string | null;
  sessionId: string | null;
  productId: string;
  quantity: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  product?: Product;
}

export interface Order {
  id: string;
  userId: string | null;
  guestEmail: string | null;
  guestName: string | null;
  guestPhone: string | null;
  shippingAddress: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  items?: OrderItem[];
  payment?: Payment | null;
  user?: User | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  product?: Product | null;
  order?: Order;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  transactionId: string | null;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  order?: Order;
}

export interface Visitor {
  id: string;
  ip: string | null;
  userAgent: string | null;
  path: string;
  createdAt: Date | string;
}

/* ------------------------------------------------------------------ */
// Filter / Input Types
/* ------------------------------------------------------------------ */

export interface ProductFilters {
  isAvailable?: boolean;
  version?: string;
  sort?: "name" | "price-low" | "price-high" | "popularity";
}

export interface OrderFilters {
  status?: string;
  fromDate?: string;
  toDate?: string;
  userId?: string;
}

export interface OrderItemFilters {
  fromDate?: Date;
  toDate?: Date;
  statusNot?: string;
}

export interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  specs?: string | object;
  version: string;
  isAvailable?: boolean;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {}

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  role?: string;
}

export interface UpdateUserInput extends Partial<Omit<CreateUserInput, "password">> {}

export interface CreateOrderItemInput {
  productId?: string | null;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface CreateOrderInput {
  userId?: string | null;
  guestEmail?: string | null;
  guestName?: string | null;
  guestPhone?: string | null;
  shippingAddress: string;
  totalAmount: number;
  status?: string;
  paymentMethod: string;
  items: CreateOrderItemInput[];
}

export interface UpdateOrderInput {
  status?: string;
  totalAmount?: number;
  shippingAddress?: string;
}

export interface CreateCartItemInput {
  userId?: string | null;
  sessionId?: string | null;
  productId: string;
  quantity: number;
}

export interface UpdateCartItemInput {
  quantity?: number;
}

export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  method: string;
  status?: string;
  transactionId?: string | null;
}

export interface UpdatePaymentInput {
  status?: string;
  transactionId?: string | null;
}

export interface CreateVisitorInput {
  ip?: string | null;
  userAgent?: string | null;
  path: string;
}

/* ------------------------------------------------------------------ */
// Dashboard
/* ------------------------------------------------------------------ */

export interface DashboardStats {
  salesOverview: { date: string; amount: number }[];
  topProducts: { name: string; quantity: number }[];
  orderStats: {
    totalOrders: number;
    pendingPayments: number;
    paidOrders: number;
    shippedOrders: number;
    completedOrders: number;
  };
  recentOrders: Order[];
  lowStockProducts: Product[];
  visitorMetrics: {
    totalPageViews: number;
    uniqueVisitors: number;
  };
}

/* ------------------------------------------------------------------ */
// Data Source Interface
/* ------------------------------------------------------------------ */

export interface DataSource {
  // Products
  getProducts(filters?: ProductFilters): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  createProduct(data: CreateProductInput): Promise<Product>;
  updateProduct(id: string, data: UpdateProductInput): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Users
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(data: CreateUserInput): Promise<User>;
  updateUser(id: string, data: UpdateUserInput): Promise<User>;

  // Orders
  getOrdersByUserId(userId: string): Promise<Order[]>;
  getOrders(filters?: OrderFilters): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | null>;
  createOrder(data: CreateOrderInput): Promise<Order>;
  updateOrder(id: string, data: UpdateOrderInput): Promise<Order>;
  deleteOrder(id: string): Promise<void>;

  // Cart
  getCartItems(userId: string | null, sessionId: string | null): Promise<CartItem[]>;
  getCartItem(
    userId: string | null,
    sessionId: string | null,
    productId: string
  ): Promise<CartItem | null>;
  createCartItem(data: CreateCartItemInput): Promise<CartItem>;
  updateCartItem(id: string, data: UpdateCartItemInput): Promise<CartItem>;
  deleteCartItem(id: string): Promise<void>;
  clearCartByUserId(userId: string): Promise<void>;

  // Payments
  getPayments(): Promise<Payment[]>;
  createPayment(data: CreatePaymentInput): Promise<Payment>;
  getPaymentByOrderId(orderId: string): Promise<Payment | null>;
  updatePayment(id: string, data: UpdatePaymentInput): Promise<Payment>;

  // Visitors
  createVisitor(data: CreateVisitorInput): Promise<Visitor>;
  getVisitorStats(): Promise<{ totalVisitors: number; uniqueVisitors: number }>;

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;

  // Order Items (for aggregations)
  getOrderItems(filters?: OrderItemFilters): Promise<OrderItem[]>;
}
