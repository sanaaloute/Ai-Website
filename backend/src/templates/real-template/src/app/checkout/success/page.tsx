"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import { useLanguage } from "@/lib/i18n/language-provider";
import { Loader2, CheckCircle, ShoppingBag } from "lucide-react";

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

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const { refresh } = useCart();
  const { translations: t } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();

    async function fetchOrder() {
      if (!orderId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        setOrder(data.order || null);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId, refresh]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-20">
      <div className="glass-card rounded-2xl p-8 sm:p-12 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>

        <h1 className="text-3xl font-bold text-slate-100 mb-3">
          {t.checkoutSuccess.thankYou}
        </h1>
        <p className="text-slate-400 mb-2">
          {t.checkoutSuccess.orderSuccess}
        </p>

        {orderId && (
          <div className="inline-block px-4 py-2 rounded-lg bg-slate-900/80 border border-slate-700 mb-8">
            <p className="text-xs text-slate-500 uppercase tracking-wider">{t.checkoutSuccess.orderId}</p>
            <p className="text-sm font-mono text-cyan-400">{orderId}</p>
          </div>
        )}

        {order && (
          <div className="text-left mb-8">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">{t.checkoutSuccess.orderSummary}</h2>
            <div className="space-y-3 mb-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover bg-slate-800 border border-slate-700/50 shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">{t.checkoutSuccess.qty}: {item.quantity}</p>
                  </div>
                  <p className="text-sm text-slate-200">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-700 pt-3 flex justify-between">
              <span className="font-bold text-slate-100">{t.checkoutSuccess.total}</span>
              <span className="font-bold text-cyan-400">${order.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>{t.checkoutSuccess.status}: {order.status}</span>
              <span>{t.checkoutSuccess.method}: {order.paymentMethod}</span>
            </div>
          </div>
        )}

        <Link href="/products">
          <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-8">
            <ShoppingBag className="w-4 h-4 mr-2" />
            {t.checkoutSuccess.continueShopping}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
