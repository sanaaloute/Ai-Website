"use client";

import { useRouter } from "next/navigation";
import { Bell, Search, Settings, User, LogOut, Globe, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSidebarStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/ui-store";
import { logoutAdmin } from "@/lib/api/client";
import { useTranslation, LOCALE_LABELS, Locale } from "@/lib/i18n";

export function Header() {
  const router = useRouter();
  const { collapsed } = useSidebarStore();
  const { user, logout } = useAuthStore();
  const { addToast } = useToastStore();
  const { t, locale, setLocale } = useTranslation();

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } catch {
      // Best-effort server-side logout; cookie will still be cleared on success.
    }
    logout();
    addToast({ title: t("header.logoutSuccess"), variant: "success" });
    router.push("/login");
  };

  return (
    <header
      className="fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-md px-6 transition-all duration-300"
      style={{ left: collapsed ? 80 : 260 }}
    >
      <div className="flex items-center gap-4 w-full max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("header.searchPlaceholder")}
            className="pl-9 bg-white/5 border-white/5"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Language Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("settings.appearance.language.label")}>
              <Globe className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-44" align="end">
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
              {t("settings.appearance.language.label")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(LOCALE_LABELS).map(([code, label]) => (
              <DropdownMenuItem
                key={code}
                onClick={() => setLocale(code as Locale)}
                className="flex items-center justify-between"
              >
                <span>{label}</span>
                {locale === code && <Check className="h-4 w-4 text-cyan" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="relative" aria-label={t("header.notifications")}>
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cyan" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-purple/20 text-purple text-xs font-bold">
                  {user?.name
                    ? user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : t("profile.fallback.initials")}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name ?? t("header.adminUser")}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email ?? t("header.adminEmail")}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="mr-2 h-4 w-4" />
              {t("header.profile")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              {t("header.settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {t("header.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
