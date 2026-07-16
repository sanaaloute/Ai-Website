"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { useLanguage } from "@/lib/i18n/language-provider";
import { toast } from "sonner";
import { Loader2, Package, User, Mail, Calendar, ArrowRight } from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}

const statusColors: Record<string, string> = {
  Pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Shipped: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Delivered: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function AccountPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { translations: t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    async function fetchOrders() {
      try {
        const res = await fetch("/api/orders");
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
            return;
          }
          throw new Error(t.account.failedToLoadOrders);
        }
        const data = await res.json();
        setOrders(data.orders || []);
      } catch {
        toast.error(t.account.failedToLoadOrders);
      } finally {
        setOrdersLoading(false);
      }
    }

    if (user) {
      fetchOrders();
    }
  }, [user, authLoading, router, t]);

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold text-slate-100 mb-8">{t.account.myAccount}</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-xl p-6 sticky top-24">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-white text-xl font-bold">
                {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">{user.name || t.account.user}</h2>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">{t.account.email}</p>
                  <p className="text-sm text-slate-200">{user.email}</p>
                </div>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">{t.account.phone}</p>
                    <p className="text-sm text-slate-200">{user.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-cyan-400" />
              {t.account.orderHistory}
            </h2>

            {ordersLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-10">
                <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 mb-4">{t.account.noOrders}</p>
                <Link href="/products">
                  <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold">
                    {t.account.shopNow}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-slate-700/50 rounded-lg p-4 hover:border-cyan-500/20 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-slate-300">#{order.id.slice(0, 8)}</span>
                        <Badge
                          variant="outline"
                          className={`${statusColors[order.status] || "bg-slate-500/10 text-slate-400"} text-xs`}
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-800 border border-slate-700/50 shadow-sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-200 truncate">{item.name}</p>
                            <p className="text-xs text-slate-500">
                              {item.quantity} × ${item.price.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                      <span className="text-xs text-slate-500 capitalize">{order.paymentMethod}</span>
                      <span className="text-sm font-bold text-cyan-400">
                        ${order.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
