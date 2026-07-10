"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, Brain, Shield, Languages } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-provider";

export default function HomePage() {
  const { translations: t } = useLanguage();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32 px-4">
        <div className="absolute inset-0 cyber-gradient opacity-50" />
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                DaaCoo
              </span>
              <br />
              <span className="text-slate-100">
                {t.landing.heroTitle}
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-lg mx-auto lg:mx-0">
              {t.landing.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/products">
                <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-8 shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {t.landing.shopNow}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/products">
                <Button size="lg" variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {t.landing.exploreDevices}
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative animate-float">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-3xl blur-2xl" />
              <div className="relative glass-card rounded-3xl p-6 sm:p-8 w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center animate-glow overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-violet-500/5" />
                
                {/* Product image */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative w-56 h-56 sm:w-64 sm:h-64 mb-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 rounded-2xl blur-md" />
                    <img
                      src="/images/product-kitchen.png"
                      alt="DaaCoo AI Device"
                      className="w-full h-full object-cover rounded-2xl border border-cyan-500/20 shadow-2xl"
                    />
                  </div>
                  <p className="text-cyan-400 font-semibold text-lg">{t.landing.productName}</p>
                </div>

                {/* Decorative orbs */}
                <div className="absolute top-4 right-4 w-3 h-3 bg-cyan-400/60 rounded-full animate-pulse-glow" />
                <div className="absolute bottom-8 left-8 w-2 h-2 bg-violet-400/60 rounded-full animate-pulse-glow" style={{ animationDelay: '0.5s' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-100 mb-4">
              {t.landing.whyChoose} <span className="text-cyan-400">DaaCoo</span>?
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              {t.landing.whyChooseSubtitle}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: MessageCircle,
                title: t.landing.feature1Title,
                description: t.landing.feature1Desc,
                bgClass: "bg-cyan-500/10",
                textClass: "text-cyan-400",
              },
              {
                icon: Brain,
                title: t.landing.feature2Title,
                description: t.landing.feature2Desc,
                bgClass: "bg-violet-500/10",
                textClass: "text-violet-400",
              },
              {
                icon: Shield,
                title: t.landing.feature3Title,
                description: t.landing.feature3Desc,
                bgClass: "bg-emerald-500/10",
                textClass: "text-emerald-400",
              },
              {
                icon: Languages,
                title: t.landing.feature4Title,
                description: t.landing.feature4Desc,
                bgClass: "bg-amber-500/10",
                textClass: "text-amber-400",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="glass-card rounded-xl p-6 hover:border-cyan-500/30 transition-colors group hover:shadow-lg hover:shadow-cyan-500/5"
              >
                <div
                  className={`w-12 h-12 rounded-lg ${feature.bgClass} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className={`w-6 h-6 ${feature.textClass}`} />
                </div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto glass-card rounded-2xl p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-violet-500" />
          <h2 className="text-3xl font-bold text-slate-100 mb-4">
            {t.landing.ctaTitle}
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            {t.landing.ctaSubtitle}
          </p>
          <Link href="/products">
            <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-8 shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
              {t.landing.browseProducts}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
