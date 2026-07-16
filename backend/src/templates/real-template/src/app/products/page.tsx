"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/components/cart-provider";
import { useLanguage } from "@/lib/i18n/language-provider";
import { toast } from "sonner";
import { ShoppingCart, Loader2, ArrowUpDown, Eye } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  version: string;
  isAvailable: boolean;
}

type SortOption = "name" | "price-low" | "price-high" | "popularity";
type VersionFilter = "all" | "Basic" | "Pro" | "Family";

const versionColors: Record<string, string> = {
  Basic: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Pro: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Family: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const versionGlow: Record<string, string> = {
  Basic: "group-hover:shadow-cyan-500/20",
  Pro: "group-hover:shadow-violet-500/20",
  Family: "group-hover:shadow-amber-500/20",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortOption>("name");
  const [version, setVersion] = useState<VersionFilter>("all");
  const { addItem } = useCart();
  const { translations: t } = useLanguage();

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?sort=${sort}&version=${version}`);
        const data = await res.json();
        setProducts(data.products || []);
      } catch {
        toast.error(t.common.failedToLoad);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [sort, version]);

  const handleAddToCart = async (productId: string) => {
    try {
      await addItem(productId, 1);
      toast.success(t.common.addedToCart);
    } catch {
      toast.error(t.common.failedToAddToCart);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">{t.products.title}</h1>
        <p className="text-slate-400">{t.products.subtitle}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="bg-slate-900/80 border border-cyan-500/20 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="name">{t.products.sortByName}</option>
            <option value="price-low">{t.products.sortByPriceLow}</option>
            <option value="price-high">{t.products.sortByPriceHigh}</option>
            <option value="popularity">{t.products.sortByPopularity}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">{t.products.versionFilter}</span>
          <div className="flex gap-2">
            {(["all", "Basic", "Pro", "Family"] as VersionFilter[]).map((v) => (
              <button
                key={v}
                onClick={() => setVersion(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  version === v
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-slate-900/80 text-slate-400 border border-slate-700 hover:border-cyan-500/20"
                }`}
              >
                {v === "all" ? t.common.all : v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl overflow-hidden">
              <div className="relative aspect-square bg-slate-900/50 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-slate-800 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-slate-800 rounded animate-pulse w-full" />
                <div className="h-4 bg-slate-800 rounded animate-pulse w-1/2" />
                <div className="flex justify-between pt-2">
                  <div className="h-6 bg-slate-800 rounded animate-pulse w-16" />
                  <div className="h-8 bg-slate-800 rounded animate-pulse w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400">{t.products.noProducts}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className={`glass-card rounded-xl overflow-hidden hover:border-cyan-500/30 transition-all duration-500 group hover:shadow-xl ${versionGlow[product.version] || ""}`}
            >
              <Link href={`/products/${product.id}`} className="block">
                <div className="relative aspect-square bg-slate-900/50 overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
                  
                  {/* Version badge */}
                  <div className="absolute top-3 left-3">
                    <Badge
                      variant="outline"
                      className={`${versionColors[product.version] || "bg-slate-500/10 text-slate-400"} text-xs backdrop-blur-sm`}
                    >
                      {product.version}
                    </Badge>
                  </div>

                  {/* Stock / Quick view overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-slate-950/60 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 border border-white/10">
                      <Eye className="w-4 h-4 text-cyan-300" />
                      <span className="text-sm font-medium text-cyan-300">{t.products.viewDetails}</span>
                    </div>
                  </div>

                  {/* Stock indicator */}
                  {product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute bottom-3 left-3">
                      <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md backdrop-blur-sm">
                        {t.products.onlyNLeft.replace("{count}", String(product.stock))}
                      </span>
                    </div>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute bottom-3 left-3">
                      <span className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-md backdrop-blur-sm">
                        {t.common.outOfStock}
                      </span>
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-4">
                <Link href={`/products/${product.id}`}>
                  <h3 className="text-lg font-semibold text-slate-100 mb-1 hover:text-cyan-400 transition-colors">
                    {product.name}
                  </h3>
                </Link>
                <p className="text-sm text-slate-400 line-clamp-2 mb-3">{t.productDescriptions[product.id] || product.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-cyan-400">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.stock > 0 && (
                      <span className="text-xs text-emerald-400 mt-0.5">{t.productDetail.inStock}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(product.id)}
                    disabled={product.stock <= 0}
                    className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                  >
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    {t.products.add}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
