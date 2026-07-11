"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useLanguage } from "@/lib/i18n/language-provider";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";

interface DashboardData {
  salesOverview: { date: string; amount: number }[];
  topProducts: { name: string; quantity: number }[];
  orderStats: {
    totalOrders: number;
    pendingPayments: number;
    paidOrders: number;
    shippedOrders: number;
    completedOrders: number;
  };
  recentOrders: {
    id: string;
    guestName: string | null;
    guestEmail: string | null;
    totalAmount: number;
    status: string;
    createdAt: string;
  }[];
  lowStockProducts: {
    id: string;
    name: string;
    stock: number;
    version: string;
  }[];
  visitorMetrics: {
    totalPageViews: number;
    uniqueVisitors: number;
  };
}

function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "Pending":
      return "outline";
    case "Paid":
      return "default";
    case "Shipped":
      return "secondary";
    case "Delivered":
      return "default";
    case "Cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case "Delivered":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "Pending":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default:
      return "";
  }
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { translations: t } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="glass-card rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">
            {t.adminDashboard.accessDenied}
          </h1>
          <p className="text-muted-foreground">
            {t.adminDashboard.noPermission}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 p-4 lg:p-8">
        <h2 className="text-2xl font-bold mb-6 neon-text">{t.adminDashboard.title}</h2>

        {loading || !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Order Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {[
                {
                  label: t.adminDashboard.totalOrders,
                  value: data.orderStats.totalOrders,
                  color: "text-primary",
                },
                {
                  label: t.adminDashboard.pending,
                  value: data.orderStats.pendingPayments,
                  color: "text-amber-400",
                },
                {
                  label: t.adminDashboard.paid,
                  value: data.orderStats.paidOrders,
                  color: "text-cyan-400",
                },
                {
                  label: t.adminDashboard.shipped,
                  value: data.orderStats.shippedOrders,
                  color: "text-purple-400",
                },
                {
                  label: t.adminDashboard.completed,
                  value: data.orderStats.completedOrders,
                  color: "text-emerald-400",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="glass-card rounded-xl p-4 text-center"
                >
                  <p className={cn("text-2xl font-bold", stat.color)}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {t.adminDashboard.salesOverview}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.salesOverview}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickFormatter={(v) =>
                        new Date(v).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid rgba(6,182,212,0.3)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#e2e8f0" }}
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, "Sales"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#06b6d4" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {t.adminDashboard.topSellingProducts}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.topProducts}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid rgba(139,92,246,0.3)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Bar
                      dataKey="quantity"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Visitor Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="glass-card rounded-xl p-6 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {data.visitorMetrics.totalPageViews}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t.adminDashboard.totalPageViews}
                  </p>
                </div>
              </div>
              <div className="glass-card rounded-xl p-6 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {data.visitorMetrics.uniqueVisitors}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t.adminDashboard.uniqueVisitors}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="glass-card rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">{t.adminDashboard.recentOrders}</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.adminDashboard.orderId}</TableHead>
                      <TableHead>{t.adminDashboard.customer}</TableHead>
                      <TableHead>{t.adminDashboard.total}</TableHead>
                      <TableHead>{t.adminDashboard.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          {order.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {order.guestName || order.guestEmail || "N/A"}
                        </TableCell>
                        <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusVariant(order.status)}
                            className={getStatusClass(order.status)}
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.recentOrders.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground py-8"
                        >
                          {t.adminDashboard.noRecentOrders}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Low Stock Alerts */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {t.adminDashboard.lowStockAlerts}
              </h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.adminDashboard.product}</TableHead>
                      <TableHead>{t.adminDashboard.version}</TableHead>
                      <TableHead>{t.adminDashboard.stock}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.lowStockProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.version}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "font-bold",
                              product.stock < 5
                                ? "text-destructive"
                                : "text-amber-400"
                            )}
                          >
                            {product.stock}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.lowStockProducts.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-muted-foreground py-8"
                        >
                          {t.adminDashboard.noLowStockAlerts}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
