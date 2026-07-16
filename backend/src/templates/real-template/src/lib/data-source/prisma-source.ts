/**
 * Prisma Data Source
 *
 * Production-ready implementation using Prisma ORM + SQLite (libSQL).
 * This is the original database layer, now wrapped behind the DataSource interface.
 */

import { prisma } from "@/lib/prisma";
import type {
  DataSource,
  Product,
  User,
  CartItem,
  Order,
  OrderItem,
  Payment,
  Visitor,
  ProductFilters,
  OrderFilters,
  OrderItemFilters,
  CreateProductInput,
  UpdateProductInput,
  CreateUserInput,
  UpdateUserInput,
  CreateOrderInput,
  UpdateOrderInput,
  CreateCartItemInput,
  UpdateCartItemInput,
  CreatePaymentInput,
  UpdatePaymentInput,
  CreateVisitorInput,
  DashboardStats,
} from "./types";

export class PrismaDataSource implements DataSource {
  // ── Products ──────────────────────────────────────────────────────

  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    const where: Record<string, unknown> = {};
    if (filters?.isAvailable !== undefined) {
      where.isAvailable = filters.isAvailable;
    }
    if (filters?.version && filters.version !== "all") {
      where.version = filters.version;
    }

    const orderBy: Record<string, string> =
      filters?.sort === "price-low"
        ? { price: "asc" }
        : filters?.sort === "price-high"
        ? { price: "desc" }
        : filters?.sort === "popularity"
        ? { orderCount: "desc" }
        : { name: "asc" };

    return prisma.product.findMany({ where, orderBy }) as Promise<Product[]>;
  }

  async getProductById(id: string): Promise<Product | null> {
    return prisma.product.findUnique({ where: { id } }) as Promise<Product | null>;
  }

  async createProduct(data: CreateProductInput): Promise<Product> {
    return prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock,
        imageUrl: data.imageUrl || "/images/daacoo-main.png",
        specs:
          typeof data.specs === "object" && data.specs !== null
            ? JSON.stringify(data.specs)
            : data.specs,
        version: data.version,
        isAvailable: data.isAvailable ?? true,
      },
    }) as Promise<Product>;
  }

  async updateProduct(id: string, data: UpdateProductInput): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.specs !== undefined && {
          specs:
            typeof data.specs === "object" && data.specs !== null
              ? JSON.stringify(data.specs)
              : data.specs,
        }),
        ...(data.version !== undefined && { version: data.version }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
      },
    }) as Promise<Product>;
  }

  async deleteProduct(id: string): Promise<void> {
    await prisma.product.delete({ where: { id } });
  }

  // ── Users ─────────────────────────────────────────────────────────

  async getUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } }) as Promise<User | null>;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } }) as Promise<User | null>;
  }

  async createUser(data: CreateUserInput): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name ?? null,
        address: data.address ?? null,
        phone: data.phone ?? null,
        role: data.role ?? "user",
      },
    }) as Promise<User>;
  }

  async updateUser(id: string, data: UpdateUserInput): Promise<User> {
    return prisma.user.update({ where: { id }, data }) as Promise<User>;
  }

  // ── Orders ────────────────────────────────────────────────────────

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }) as Promise<Order[]>;
  }

  async getOrders(filters?: OrderFilters): Promise<Order[]> {
    const where: Record<string, unknown> = {};
    if (filters?.status && filters.status !== "all") {
      where.status = filters.status;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(
          filters.fromDate
        );
      }
      if (filters.toDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(
          filters.toDate
        );
      }
    }

    return prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { items: true, payment: true },
    }) as Promise<Order[]>;
  }

  async getOrderById(id: string): Promise<Order | null> {
    return prisma.order.findUnique({
      where: { id },
      include: { items: true, payment: true },
    }) as Promise<Order | null>;
  }

  async createOrder(data: CreateOrderInput): Promise<Order> {
    const order = await prisma.order.create({
      data: {
        userId: data.userId,
        guestEmail: data.guestEmail,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        shippingAddress: data.shippingAddress,
        totalAmount: data.totalAmount,
        status: data.status ?? "Pending",
        paymentMethod: data.paymentMethod,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.imageUrl,
          })),
        },
      },
      include: { items: true },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: data.totalAmount,
        method: data.paymentMethod,
        status: "pending",
      },
    });

    if (data.userId) {
      await prisma.cart.deleteMany({ where: { userId: data.userId } });
    }

    return prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true, payment: true },
    }) as Promise<Order>;
  }

  async updateOrder(id: string, data: UpdateOrderInput): Promise<Order> {
    return prisma.order.update({
      where: { id },
      data,
    }) as Promise<Order>;
  }

  async deleteOrder(id: string): Promise<void> {
    await prisma.order.delete({ where: { id } });
  }

  // ── Cart ──────────────────────────────────────────────────────────

  async getCartItems(
    userId: string | null,
    sessionId: string | null
  ): Promise<CartItem[]> {
    return prisma.cart.findMany({
      where: userId ? { userId } : { sessionId },
      include: { product: true },
    }) as Promise<CartItem[]>;
  }

  async getCartItem(
    userId: string | null,
    sessionId: string | null,
    productId: string
  ): Promise<CartItem | null> {
    return prisma.cart.findFirst({
      where: userId
        ? { userId, productId }
        : { sessionId, productId },
    }) as Promise<CartItem | null>;
  }

  async createCartItem(data: CreateCartItemInput): Promise<CartItem> {
    return prisma.cart.create({
      data: {
        userId: data.userId,
        sessionId: data.sessionId,
        productId: data.productId,
        quantity: data.quantity,
      },
      include: { product: true },
    }) as Promise<CartItem>;
  }

  async updateCartItem(
    id: string,
    data: UpdateCartItemInput
  ): Promise<CartItem> {
    return prisma.cart.update({
      where: { id },
      data,
      include: { product: true },
    }) as Promise<CartItem>;
  }

  async deleteCartItem(id: string): Promise<void> {
    await prisma.cart.delete({ where: { id } });
  }

  async clearCartByUserId(userId: string): Promise<void> {
    await prisma.cart.deleteMany({ where: { userId } });
  }

  // ── Payments ──────────────────────────────────────────────────────

  async getPayments(): Promise<Payment[]> {
    return prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      include: { order: { include: { items: true } } },
    }) as Promise<Payment[]>;
  }

  async createPayment(data: CreatePaymentInput): Promise<Payment> {
    return prisma.payment.create({
      data: {
        orderId: data.orderId,
        amount: data.amount,
        method: data.method,
        status: data.status ?? "pending",
        transactionId: data.transactionId,
      },
    }) as Promise<Payment>;
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { orderId },
    }) as Promise<Payment | null>;
  }

  async updatePayment(
    id: string,
    data: UpdatePaymentInput
  ): Promise<Payment> {
    return prisma.payment.update({
      where: { id },
      data,
    }) as Promise<Payment>;
  }

  // ── Visitors ──────────────────────────────────────────────────────

  async createVisitor(data: CreateVisitorInput): Promise<Visitor> {
    return prisma.visitor.create({
      data: {
        ip: data.ip,
        userAgent: data.userAgent,
        path: data.path,
      },
    }) as Promise<Visitor>;
  }

  async getVisitorStats(): Promise<{
    totalVisitors: number;
    uniqueVisitors: number;
  }> {
    const totalVisitors = await prisma.visitor.count();
    const uniqueVisitors = await prisma.visitor.groupBy({
      by: ["ip"],
      _count: { ip: true },
    });
    return { totalVisitors, uniqueVisitors: uniqueVisitors.length };
  }

  // ── Dashboard ─────────────────────────────────────────────────────

  async getDashboardStats(): Promise<DashboardStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ordersLast30Days = await prisma.order.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { not: "Cancelled" },
      },
      select: { totalAmount: true, createdAt: true },
    });

    const salesByDay: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      salesByDay[d.toISOString().split("T")[0]] = 0;
    }

    ordersLast30Days.forEach((order) => {
      const key = order.createdAt.toISOString().split("T")[0];
      if (salesByDay[key] !== undefined) {
        salesByDay[key] += order.totalAmount;
      }
    });

    const salesOverview = Object.entries(salesByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: thirtyDaysAgo },
          status: { not: "Cancelled" },
        },
      },
      select: { name: true, quantity: true },
    });

    const productSales: Record<string, number> = {};
    orderItems.forEach((item) => {
      productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
    });

    const topProducts = Object.entries(productSales)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity);

    const totalOrders = await prisma.order.count();
    const pendingPayments = await prisma.order.count({
      where: { status: "Pending" },
    });
    const completedOrders = await prisma.order.count({
      where: { status: "Delivered" },
    });
    const paidOrders = await prisma.order.count({
      where: { status: "Paid" },
    });
    const shippedOrders = await prisma.order.count({
      where: { status: "Shipped" },
    });

    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { items: { take: 1 } },
    });

    const lowStockProducts = await prisma.product.findMany({
      where: { stock: { lt: 10 }, isAvailable: true },
      orderBy: { stock: "asc" },
    });

    const { totalVisitors, uniqueVisitors } = await this.getVisitorStats();

    return {
      salesOverview,
      topProducts,
      orderStats: {
        totalOrders,
        pendingPayments,
        paidOrders,
        shippedOrders,
        completedOrders,
      },
      recentOrders: recentOrders as Order[],
      lowStockProducts: lowStockProducts as Product[],
      visitorMetrics: {
        totalPageViews: totalVisitors,
        uniqueVisitors,
      },
    };
  }

  // ── Order Items ───────────────────────────────────────────────────

  async getOrderItems(filters?: OrderItemFilters): Promise<OrderItem[]> {
    const where: Record<string, unknown> = {};
    if (filters?.statusNot || filters?.fromDate || filters?.toDate) {
      where.order = {};
      if (filters.statusNot) {
        (where.order as Record<string, unknown>).status = { not: filters.statusNot };
      }
      if (filters.fromDate || filters.toDate) {
        (where.order as Record<string, unknown>).createdAt = {};
        if (filters.fromDate) {
          ((where.order as Record<string, unknown>).createdAt as Record<string, unknown>).gte =
            filters.fromDate;
        }
        if (filters.toDate) {
          ((where.order as Record<string, unknown>).createdAt as Record<string, unknown>).lte =
            filters.toDate;
        }
      }
    }

    return prisma.orderItem.findMany({ where }) as Promise<OrderItem[]>;
  }
}
