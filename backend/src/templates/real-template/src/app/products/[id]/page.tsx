"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/components/cart-provider";
import { useLanguage } from "@/lib/i18n/language-provider";
import { toast } from "sonner";
import { Loader2, ShoppingCart, Minus, Plus, ArrowLeft, MessageSquare, Cpu, Wifi, Battery, Volume2, Zap } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  version: string;
  specs: string | null;
  isAvailable: boolean;
}

const versionColors: Record<string, string> = {
  Basic: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Pro: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Family: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const versionGlow: Record<string, string> = {
  Basic: "shadow-cyan-500/20",
  Pro: "shadow-violet-500/20",
  Family: "shadow-amber-500/20",
};

const versionAccent: Record<string, string> = {
  Basic: "from-cyan-500/20 to-cyan-500/5",
  Pro: "from-violet-500/20 to-violet-500/5",
  Family: "from-amber-500/20 to-amber-500/5",
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);
  const { addItem } = useCart();
  const { translations: t } = useLanguage();

  const demoConversation = [
    { role: "user", text: t.productDetail.demoMessage1 },
    { role: "ai", text: t.productDetail.demoMessage2 },
    { role: "user", text: t.productDetail.demoMessage3 },
    { role: "ai", text: t.productDetail.demoMessage4 },
  ];

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();
        setProduct(data.product || null);
      } catch {
        toast.error(t.common.failedToLoad);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      await addItem(product.id, quantity);
      toast.success(`${t.productDetail.addedToCart}: ${quantity} \u00d7 ${product.name}`);
    } catch {
      toast.error(t.productDetail.failedToAddToCart);
    }
  };

  const specs = product?.specs ? (() => {
    try {
      return JSON.parse(product.specs) as Record<string, string>;
    } catch {
      return null;
    }
  })() : null;

  const specIcons: Record<string, React.ReactNode> = {
    processor: <Cpu className="w-5 h-5 text-cyan-400" />,
    connectivity: <Wifi className="w-5 h-5 text-violet-400" />,
    battery: <Battery className="w-5 h-5 text-emerald-400" />,
    audio: <Volume2 className="w-5 h-5 text-amber-400" />,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-slate-400 mb-4">{t.productDetail.notFound}</p>
        <Link href="/products">
          <Button variant="outline" className="border-cyan-500/30 text-cyan-400">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.productDetail.backToProducts}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
      <Link href="/products" className="inline-flex items-center text-sm text-slate-400 hover:text-cyan-400 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        {t.productDetail.backToProducts}
      </Link>

      <div className="grid lg:grid-cols-2 gap-10 mb-12 items-start">
        {/* Image */}
        <div className="flex justify-center lg:sticky lg:top-24">
          <div className="relative animate-float w-full max-w-lg">
            <div className={`absolute inset-0 bg-gradient-to-br ${versionAccent[product.version] || "from-cyan-500/10 to-cyan-500/5"} rounded-3xl blur-2xl`} />
            <div className={`relative glass-card rounded-3xl p-6 sm:p-8 animate-glow shadow-2xl ${versionGlow[product.version] || ""}`}>
              <div className="relative overflow-hidden rounded-2xl bg-slate-900/40">
                {!imgLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-slate-800/60 z-10" />
                )}
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  onLoad={() => setImgLoaded(true)}
                  className={`w-full rounded-2xl transition-all duration-700 ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
                />
                {/* Subtle reflection/shine */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none rounded-2xl" />
              </div>
            </div>
            
            {/* Floating decorative elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl animate-pulse-glow" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-violet-500/10 rounded-full blur-xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge
              variant="outline"
              className={`${versionColors[product.version] || "bg-slate-500/10 text-slate-400"}`}
            >
              {product.version}
            </Badge>
            {product.stock > 0 ? (
              <span className="text-sm text-emerald-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                {t.productDetail.inStock}
              </span>
            ) : (
              <span className="text-sm text-red-400">{t.productDetail.outOfStock}</span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-100 tracking-tight">{product.name}</h1>


          <p className="text-3xl sm:text-4xl font-bold text-cyan-400">${product.price.toFixed(2)}</p>

          <p className="text-slate-400 leading-relaxed text-base sm:text-lg">{t.productDescriptions[product.id] || product.description}</p>

          {/* Quantity Selector */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">{t.productDetail.quantity}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:border-cyan-500/30 hover:bg-slate-700 transition-all active:scale-95"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-semibold text-slate-100 text-lg">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:border-cyan-500/30 hover:bg-slate-700 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <Button
            size="lg"
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-8 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {t.productDetail.addToCart}
          </Button>
        </div>
      </div>

      {/* Specs & Demo */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Technical Specs */}
        <div className="glass-card rounded-xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            {t.productDetail.technicalSpecs}
          </h2>
          {specs ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(specs).map(([key, value]) => (
                <div key={key} className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/20 transition-colors">
                  <div className="mt-0.5">
                    {specIcons[key.toLowerCase()] || <Cpu className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">{key}</p>
                    <p className="text-sm text-slate-200 font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: t.productDetail.processor, value: t.productDetail.processorDefault, icon: <Cpu className="w-5 h-5 text-cyan-400" /> },
                { label: t.productDetail.connectivity, value: t.productDetail.connectivityDefault, icon: <Wifi className="w-5 h-5 text-violet-400" /> },
                { label: t.productDetail.battery, value: t.productDetail.batteryDefault, icon: <Battery className="w-5 h-5 text-emerald-400" /> },
                { label: t.productDetail.audio, value: t.productDetail.audioDefault, icon: <Volume2 className="w-5 h-5 text-amber-400" /> },
              ].map((spec) => (
                <div key={spec.label} className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/20 transition-colors">
                  <div className="mt-0.5">{spec.icon}</div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">{spec.label}</p>
                    <p className="text-sm text-slate-200 font-medium">{spec.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversation Demo */}
        <div className="glass-card rounded-xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-400" />
            {t.productDetail.sampleConversation}
          </h2>
          <div className="space-y-4">
            {demoConversation.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-cyan-500/20 text-cyan-100 border border-cyan-500/20"
                      : "bg-slate-800 text-slate-200 border border-slate-700"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
