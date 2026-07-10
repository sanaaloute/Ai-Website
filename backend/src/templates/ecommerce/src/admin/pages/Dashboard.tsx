import { useEffect, useState } from 'react';
import { Package, ShoppingCart, Users, Star, TrendingUp, AlertCircle } from 'lucide-react';
import {
  listAllProducts,
  listAllOrders,
  listAllUsers,
  listAllReviews,
  type Product,
  type Order,
} from '@/lib/pocketbase';
import { AdminCard, PageHeader, Skeleton } from '@/admin/components/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';

interface DashboardStats {
  products: number;
  orders: number;
  users: number;
  reviews: number;
  revenue: number;
  lowStock: Product[];
  recentOrders: Order[];
  loading: boolean;
  error: string | null;
}

export default function AdminDashboard() {
  const { addToast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    products: 0,
    orders: 0,
    users: 0,
    reviews: 0,
    revenue: 0,
    lowStock: [],
    recentOrders: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [products, orders, users, reviews] = await Promise.all([
          listAllProducts(1, 1),
          listAllOrders(1, 5),
          listAllUsers(1, 1),
          listAllReviews(1, 1),
        ]);

        const lowStockRes = await listAllProducts(1, 100, { status: 'active' });
        const lowStock = lowStockRes.items.filter((p) => p.stock < 10);
        const revenue = orders.items.reduce(
          (sum, o) => (o.status !== 'cancelled' ? sum + o.total : sum),
          0
        );

        if (cancelled) return;
        setStats({
          products: products.totalItems,
          orders: orders.totalItems,
          users: users.totalItems,
          reviews: reviews.totalItems,
          revenue,
          lowStock,
          recentOrders: orders.items,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not load dashboard data.';
        setStats((s) => ({ ...s, loading: false, error: message }));
        addToast({ variant: 'error', title: 'Dashboard error', message });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const statCards = [
    { label: 'Products', value: stats.products, icon: Package },
    { label: 'Orders', value: stats.orders, icon: ShoppingCart },
    { label: 'Users', value: stats.users, icon: Users },
    { label: 'Reviews', value: stats.reviews, icon: Star },
  ];

  if (stats.loading) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <AdminCard key={i}>
              <Skeleton className="h-16" />
            </AdminCard>
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <AdminCard>
            <Skeleton className="h-24" />
          </AdminCard>
          <AdminCard>
            <Skeleton className="h-24" />
          </AdminCard>
          <AdminCard className="lg:col-span-2">
            <Skeleton className="h-48" />
          </AdminCard>
        </div>
      </div>
    );
  }

  if (stats.error) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <AdminCard className="flex items-center gap-4 border-red-200 bg-red-50">
          <AlertCircle className="h-8 w-8 text-red-600" />
          <div>
            <h2 className="font-semibold text-red-900">Failed to load dashboard</h2>
            <p className="text-sm text-red-700">{stats.error}</p>
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <AdminCard key={card.label}>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-2">
                <card.icon className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{card.label}</p>
                <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
              </div>
            </div>
          </AdminCard>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AdminCard>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Revenue</h2>
          </div>
          <p className="mt-2 text-3xl font-semibold text-gray-900">${stats.revenue.toFixed(2)}</p>
          <p className="text-sm text-gray-600">Total from non-cancelled orders</p>
        </AdminCard>

        <AdminCard>
          <h2 className="text-lg font-semibold text-gray-900">Low stock</h2>
          {stats.lowStock.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">No low-stock products.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {stats.lowStock.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-900">{p.name}</span>
                  <Badge variant="warning">{p.stock} left</Badge>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900">Recent orders</h2>
          {stats.recentOrders.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">No orders yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="pb-2 font-medium">Order</th>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((o) => (
                    <tr key={o.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 font-medium text-gray-900">#{o.id.slice(-6)}</td>
                      <td className="py-3 text-gray-600">{o.expand?.user?.email || o.user}</td>
                      <td className="py-3">
                        <Badge
                          variant={
                            o.status === 'paid' || o.status === 'shipped'
                              ? 'success'
                              : o.status === 'cancelled'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {o.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-medium text-gray-900">
                        ${o.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
