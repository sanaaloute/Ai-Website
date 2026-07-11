"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Heart,
  User,
  Settings,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/ui-store";
import { useTranslation } from "@/lib/i18n";

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarStore();
  const { t } = useTranslation();

  const mainNavItems = [
    { label: t("sidebar.dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { label: t("sidebar.users"), href: "/users", icon: Users },
    { label: t("sidebar.subscriptions"), href: "/subscriptions", icon: CreditCard },
    { label: t("sidebar.behavior"), href: "/behavior", icon: BarChart3 },
    { label: "Generations", href: "/generations", icon: Activity },
    { label: t("sidebar.logs"), href: "/logs", icon: ScrollText },
  ];

  const accountNavItems = [
    { label: t("sidebar.profile"), href: "/profile", icon: User },
    { label: t("sidebar.settings"), href: "/settings", icon: Settings },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/5 bg-sidebar-bg cursor-pointer"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest("a, button, input, [role='tablist']")) {
          toggle();
        }
      }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan to-purple shadow-glow-cyan">
          <Heart className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-lg font-bold tracking-tight text-white"
          >
            {t("sidebar.appName")}
          </motion.span>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {mainNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-cyan"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-cyan/10 border border-cyan/20"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className="relative z-10 h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="relative z-10">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Account Nav */}
      <div className="px-3 pb-2">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("sidebar.account")}
          </p>
        )}
        <div className="space-y-1">
          {accountNavItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "text-cyan"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-cyan/10 border border-cyan/20"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 h-5 w-5 shrink-0" />
                {!collapsed && (
                  <span className="relative z-10">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-white/5 p-3">
        <button
          onClick={toggle}
          className="flex h-9 w-full items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <ChevronLeft className="h-4 w-4" />
              <span>{t("sidebar.collapse")}</span>
            </div>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
