"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  CreditCard,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-provider";
import { LanguageToggle } from "@/components/language-toggle";

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { translations: t } = useLanguage();

  const navItems = [
    { href: "/admin", label: t.adminSidebar.dashboard, icon: LayoutDashboard },
    { href: "/admin/products", label: t.adminSidebar.products, icon: Package },
    { href: "/admin/orders", label: t.adminSidebar.orders, icon: ShoppingCart },
    { href: "/admin/payments", label: t.adminSidebar.payments, icon: CreditCard },
  ];

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary neon-text"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-border/50 glass-card">
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-xl font-bold neon-text tracking-tight">
            {t.adminSidebar.title}
          </h1>
          <LanguageToggle size="icon" />
        </div>
        <div className="flex-1 px-4 py-2">
          <NavLinks />
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-border/50 glass-card sticky top-0 z-40">
        <h1 className="text-lg font-bold neon-text">{t.adminSidebar.title}</h1>
        <div className="flex items-center gap-2">
          <LanguageToggle size="icon" />
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0 glass-card">
            <div className="p-6">
              <h1 className="text-xl font-bold neon-text tracking-tight">
                {t.adminSidebar.title}
              </h1>
            </div>
            <div className="px-4 py-2">
              <NavLinks onClick={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
