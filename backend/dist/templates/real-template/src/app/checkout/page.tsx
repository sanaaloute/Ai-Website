"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/components/cart-provider";
import { useLanguage } from "@/lib/i18n/language-provider";
import { toast } from "sonner";
import { Loader2, CreditCard, QrCode, ArrowLeft, ShieldCheck } from "lucide-react";
import { StripeElementsCheckout } from "@/components/stripe-elements-checkout";

type PaymentMethod = "stripe" | "alipay" | "wechatpay" | "unionpay";

const apmMethods: PaymentMethod[] = ["alipay", "wechatpay", "unionpay"];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, loading, refresh } = useCart();
  const { translations: t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const handleCardSuccess = useCallback(() => {
    if (createdOrderId) {
      router.push(`/checkout/success?orderId=${createdOrderId}`);
    }
  }, [router, createdOrderId]);

  const handleCardError = useCallback((msg: string) => {
    toast.error(msg);
  }, []);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    shippingAddress: "",
  });

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = subtotal * 0.1;
  const shipping = subtotal > 50 ? 0 : items.length > 0 ? 10 : 0;
  const total = subtotal + tax + shipping;

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const createOrder = async (): Promise<string | null> => {
    try {
      const orderItems = items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        imageUrl: item.product.imageUrl,
      }));

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderItems,
          shippingAddress: form.shippingAddress,
          fullName: form.fullName,
          phone: form.phone,
          email: form.email,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.checkout.orderCreationFailed);
      return data.order.id;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.checkout.orderCreationFailed);
      return null;
    }
  };

  const handleCardCheckout = async () => {
    setSubmitting(true);
    const orderId = await createOrder();
    setSubmitting(false);
    if (orderId) {
      setCreatedOrderId(orderId);
    }
  };

  const handleApmCheckout = async () => {
    setSubmitting(true);
    const orderId = await createOrder();
    if (!orderId) {
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.checkout.stripeSessionFailed);
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(t.checkout.noCheckoutUrl);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.checkout.stripeSessionFailed);
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (createdOrderId) {
      // Prevent duplicate order creation while the card form is shown
      return;
    }

    if (!form.fullName || !form.email || !form.phone || !form.shippingAddress) {
      toast.error(t.checkout.fillRequired);
      return;
    }
    if (items.length === 0) {
      toast.error(t.checkout.emptyCart);
      return;
    }

    if (paymentMethod === "stripe") {
      handleCardCheckout();
    } else {
      handleApmCheckout();
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
        <h1 className="text-2xl font-bold text-slate-100 mb-4">{t.checkout.emptyCart}</h1>
        <Link href="/products">
          <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold">
            {t.common.browseProducts}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <Link href="/cart" className="inline-flex items-center text-sm text-slate-400 hover:text-cyan-400 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        {t.checkout.backToCart}
      </Link>

      <h1 className="text-3xl font-bold text-slate-100 mb-8">{t.checkout.title}</h1>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Info */}
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-lg font-bold text-slate-100 mb-4">{t.checkout.shippingInfo}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="fullName" className="text-slate-300">{t.checkout.fullName}</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className="mt-1.5 bg-slate-900/80 border-slate-700 text-slate-200 focus:border-cyan-500/50"
                  placeholder={t.checkout.fullNamePlaceholder}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-slate-300">{t.checkout.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="mt-1.5 bg-slate-900/80 border-slate-700 text-slate-200 focus:border-cyan-500/50"
                  placeholder={t.checkout.emailPlaceholder}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-slate-300">{t.checkout.phone}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="mt-1.5 bg-slate-900/80 border-slate-700 text-slate-200 focus:border-cyan-500/50"
                  placeholder={t.checkout.phonePlaceholder}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="shippingAddress" className="text-slate-300">{t.checkout.shippingAddress}</Label>
                <Input
                  id="shippingAddress"
                  value={form.shippingAddress}
                  onChange={(e) => handleChange("shippingAddress", e.target.value)}
                  className="mt-1.5 bg-slate-900/80 border-slate-700 text-slate-200 focus:border-cyan-500/50"
                  placeholder={t.checkout.addressPlaceholder}
                  required
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-lg font-bold text-slate-100 mb-4">{t.checkout.paymentMethod}</h2>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {([
                { id: "stripe", label: t.checkout.stripeCard, icon: <CreditCard className="w-4 h-4" /> },
                { id: "alipay", label: t.checkout.alipay, icon: <QrCode className="w-4 h-4" /> },
                { id: "wechatpay", label: t.checkout.wechatPay, icon: <QrCode className="w-4 h-4" /> },
                { id: "unionpay", label: t.checkout.unionPay, icon: <CreditCard className="w-4 h-4" /> },
              ] as { id: PaymentMethod; label: string; icon: React.ReactNode }[]).map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method.id);
                    setCreatedOrderId(null);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    paymentMethod === method.id
                      ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                      : "border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {method.icon}
                  <span className="text-sm font-medium">{method.label}</span>
                </button>
              ))}
            </div>

            {/* Payment-specific UI */}
            {paymentMethod === "stripe" && (
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm font-medium text-slate-200">{t.checkout.payWithCard}</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Pay securely with your card using Stripe.
                </p>
                {createdOrderId && (
                  <StripeElementsCheckout
                    orderId={createdOrderId}
                    onSuccess={handleCardSuccess}
                    onError={handleCardError}
                  />
                )}
              </div>
            )}

            {apmMethods.includes(paymentMethod) && (
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  {paymentMethod === "alipay" && <QrCode className="w-5 h-5 text-cyan-400" />}
                  {paymentMethod === "wechatpay" && <QrCode className="w-5 h-5 text-emerald-400" />}
                  {paymentMethod === "unionpay" && <CreditCard className="w-5 h-5 text-amber-400" />}
                  <span className="text-sm font-medium text-slate-200">
                    Continue with{" "}
                    {paymentMethod === "alipay" && t.checkout.alipay}
                    {paymentMethod === "wechatpay" && t.checkout.wechatPay}
                    {paymentMethod === "unionpay" && t.checkout.unionPay}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  You will be redirected to Stripe Checkout to complete payment securely.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-xl p-6 sticky top-24">
            <h2 className="text-lg font-bold text-slate-100 mb-4">{t.checkout.orderSummary}</h2>
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="w-12 h-12 rounded-lg object-cover bg-slate-800 border border-slate-700/50 shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{item.product.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.quantity} × ${item.product.price.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-200">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-700 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>{t.checkout.subtotal}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{t.checkout.tax}</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{t.checkout.shipping}</span>
                <span>{shipping === 0 ? t.checkout.free : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="font-bold text-slate-100">{t.checkout.total}</span>
                <span className="font-bold text-cyan-400">${total.toFixed(2)}</span>
              </div>
            </div>
            {!createdOrderId && (
              <Button
                type="submit"
                disabled={submitting}
                className="w-full mt-6 bg-cyan-500 hover:bg-cyan-600 text-black font-bold disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.checkout.processing}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    {t.checkout.placeOrder}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
