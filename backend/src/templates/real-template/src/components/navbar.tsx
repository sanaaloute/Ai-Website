"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useCart } from "@/components/cart-provider";
import { useLanguage } from "@/lib/i18n/language-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { translations: t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide navbar on admin routes — admin has its own sidebar chrome
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-cyan-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Logo - Left */}
          <div className="flex-shrink-0 w-[180px]">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                D
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                DaaCoo
              </span>
            </Link>
          </div>

          {/* Center Nav Links */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-8">
            <Link href="/" className="text-sm text-slate-300 hover:text-cyan-400 transition-colors">
              {t.navbar.home}
            </Link>
            <Link href="/products" className="text-sm text-slate-300 hover:text-cyan-400 transition-colors">
              {t.navbar.products}
            </Link>
            <Link href="/contact" className="text-sm text-slate-300 hover:text-cyan-400 transition-colors">
              {t.navbar.contacts}
            </Link>
            <Link href="/about" className="text-sm text-slate-300 hover:text-cyan-400 transition-colors">
              {t.navbar.about}
            </Link>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center justify-end gap-4 w-[180px]">
            <Link href="/cart" className="relative text-sm text-slate-300 hover:text-cyan-400 transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-cyan-500 text-[10px] text-black font-bold rounded-full flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
            {user ? (
              <div className="flex items-center gap-3">
                <Link href="/account">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10">
                    <User className="w-4 h-4 mr-1" />
                    {user.name || user.email}
                  </Button>
                </Link>
                <LanguageToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                >
                  {t.navbar.logout}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LanguageToggle />
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-cyan-400">
                    {t.navbar.login}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold">
                    {t.navbar.signUp}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <button
            className="md:hidden text-slate-300 ml-auto"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-cyan-500/10 px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-medium">{t.navbar.language}</span>
            <LanguageToggle size="sm" />
          </div>
          <div className="border-t border-cyan-500/10 pt-3 space-y-3">
            <Link href="/" className="block text-slate-300 hover:text-cyan-400" onClick={() => setMobileOpen(false)}>
              {t.navbar.home}
            </Link>
            <Link href="/products" className="block text-slate-300 hover:text-cyan-400" onClick={() => setMobileOpen(false)}>
              {t.navbar.products}
            </Link>
            <Link href="/contact" className="block text-slate-300 hover:text-cyan-400" onClick={() => setMobileOpen(false)}>
              {t.navbar.contacts}
            </Link>
            <Link href="/about" className="block text-slate-300 hover:text-cyan-400" onClick={() => setMobileOpen(false)}>
              {t.navbar.about}
            </Link>
            <Link href="/cart" className="block text-slate-300 hover:text-cyan-400" onClick={() => setMobileOpen(false)}>
              {t.navbar.cart} ({count})
            </Link>
          </div>
          {user ? (
            <>
              <Link href="/account" className="block text-slate-300 hover:text-cyan-400" onClick={() => setMobileOpen(false)}>
                {t.navbar.myAccount}
              </Link>
              <button onClick={() => { logout(); setMobileOpen(false); }} className="block text-red-400">
                {t.navbar.logout}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="block text-slate-300 hover:text-cyan-400" onClick={() => setMobileOpen(false)}>
                {t.navbar.login}
              </Link>
              <Link href="/register" className="block text-cyan-400" onClick={() => setMobileOpen(false)}>
                {t.navbar.signUp}
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
