"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import { useLanguage } from "@/lib/i18n/language-provider";
import { toast } from "sonner";
import { Loader2, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";

export default function CartPage() {
  const { items, loading, updateItem, removeItem, refresh } = useCart();
  const { translations: t } = useLanguage();

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = subtotal * 0.1;
  const shipping = subtotal > 50 ? 0 : items.length > 0 ? 10 : 0;
  const total = subtotal + tax + shipping;

  const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      await updateItem(cartItemId, newQuantity);
    } catch {
      toast.error(t.cart.failedToUpdate);
    }
  };

  const handleRemove = async (cartItemId: string) => {
    try {
      await removeItem(cartItemId);
      toast.success(t.cart.itemRemoved);
    } catch {
      toast.error(t.cart.failedToRemove);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-slate-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">{t.cart.emptyTitle}</h1>
        <p className="text-slate-400 mb-8">{t.cart.emptyMessage}</p>
        <Link href="/products">
          <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold">
            {t.cart.browseProducts}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="text-3xl font-bold text-slate-100 mb-8">{t.cart.title}</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="glass-card rounded-xl p-4 flex gap-4 items-center"
            >
              <img
                src={item.product.imageUrl}
                alt={item.product.name}
                className="w-20 h-20 rounded-xl object-cover bg-slate-800 border border-slate-700/50 shadow-sm transition-transform hover:scale-105"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-slate-100 truncate">
                  {item.product.name}
                </h3>
                <p className="text-sm text-cyan-400 font-medium">
                  ${item.product.price.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:border-cyan-500/30 transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-8 text-center text-sm font-semibold text-slate-100">
                  {item.quantity}
                </span>
                <button
                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:border-cyan-500/30 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="text-right min-w-[80px]">
                <p className="text-base font-bold text-slate-100">
                  ${(item.product.price * item.quantity).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => handleRemove(item.id)}
                className="p-2 text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-xl p-6 sticky top-24">
            <h2 className="text-lg font-bold text-slate-100 mb-4">{t.cart.orderSummary}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>{t.cart.subtotal}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{t.cart.tax}</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{t.cart.shipping}</span>
                <span>{shipping === 0 ? t.common.free : `$${shipping.toFixed(2)}`}</span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-amber-400">
                  {t.cart.freeShippingHint}
                </p>
              )}
              <div className="border-t border-slate-700 pt-3 flex justify-between">
                <span className="text-base font-bold text-slate-100">{t.cart.total}</span>
                <span className="text-base font-bold text-cyan-400">${total.toFixed(2)}</span>
              </div>
            </div>
            <Link href="/checkout">
              <Button className="w-full mt-6 bg-cyan-500 hover:bg-cyan-600 text-black font-bold">
                {t.cart.proceedToCheckout}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
