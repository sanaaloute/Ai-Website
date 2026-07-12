"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogIn, User, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import LoginSection from "@/components/landing/LoginSection";
import LanguageSwitcher from "@/components/landing/LanguageSwitcher";
import { useLandingAuthStore } from "@/stores/landingAuthStore";
import { ApiKeyDialog } from "@/components/shared/ApiKeyDialog";
import { UpgradeDialog } from "@/components/shared/UpgradeDialog";
import { useLandingAuth } from "@/hooks/useLandingAuth";
import { Link } from "@/i18n/navigation";

export default function Navbar({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("navbar");
  useLandingAuth();
  const pathname = usePathname();
  const navItems = [
    { label: t("home"), href: "/" },
    { label: t("projects"), href: "/projects" },
    { label: t("templates"), href: "/templates" },
    { label: t("github"), href: "https://github.com", external: true },
  ];
  const [menuOpen, setMenuOpen] = useState(false);
  const isAuthenticated = useLandingAuthStore((s) => s.isAuthenticated);
  const profileAvatarUrl = useLandingAuthStore((s) => s.profileAvatarUrl);
  const profileDisplayName = useLandingAuthStore((s) => s.profileDisplayName);
  const loginDialogOpen = useLandingAuthStore((s) => s.loginDialogOpen);
  const openLoginDialog = useLandingAuthStore((s) => s.openLoginDialog);
  const closeLoginDialog = useLandingAuthStore((s) => s.closeLoginDialog);
  const openApiKeyDialog = useLandingAuthStore((s) => s.openApiKeyDialog);
  const isProtectedAppHref = (href: string) =>
    href.startsWith("/builder") ||
    href.startsWith("/generation") ||
    href.startsWith("/projects") ||
    href.startsWith("/profile");

  const resolveHref = (href: string) => {
    if (href.startsWith("#") && pathname !== "/") {
      return `/${href}`;
    }
    return href;
  };

  const navSize = compact ? "text-xs" : "text-sm";
  const brandMark = compact ? "text-xs" : "text-base";
  const radius = compact ? "rounded-md" : "rounded-xl";

  return (
    <>
      <header
        id="top"
        className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-background/90 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <motion.nav
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex w-full items-center justify-between gap-3"
          >
            <Link href="/" className="flex min-w-0 flex-shrink-0 items-center gap-2.5">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center bg-primary text-white ${radius}`}
              >
                <span className={`${brandMark} font-semibold`}>AW</span>
              </div>
              <span className={`block truncate font-semibold text-white ${navSize}`}>
                {t("brandName")}
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden flex-nowrap items-center gap-0.5 lg:flex">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={resolveHref(item.href)}
                  target={(item as { external?: boolean }).external ? "_blank" : undefined}
                  rel={(item as { external?: boolean }).external ? "noreferrer" : undefined}
                  onClick={(event) => {
                    if (!isAuthenticated && isProtectedAppHref(item.href)) {
                      event.preventDefault();
                      openLoginDialog();
                    }
                  }}
                  className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-400 transition hover:text-white"
                  title={item.label}
                >
                  {item.label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => openApiKeyDialog()}
                className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-400 transition hover:text-white"
                title={t("getApiKey")}
              >
                {t("getApiKey")}
              </button>
            </div>

            {/* Desktop actions */}
            <div className="hidden flex-nowrap items-center gap-2 lg:flex">
              <a
                href={resolveHref("#download")}
                title={t("download")}
                aria-label={t("download")}
                className={`inline-flex items-center justify-center bg-primary p-2 text-sm font-semibold text-white transition hover:bg-primary/90 ${radius}`}
              >
                <Download size={16} className="shrink-0" aria-hidden />
              </a>
              <LanguageSwitcher />
              {isAuthenticated ? (
                <a
                  href="/profile"
                  title={t("profile")}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-background-soft text-zinc-300 transition hover:border-primary/50 hover:text-white`}
                >
                  {profileAvatarUrl ? (
                    <img
                      src={profileAvatarUrl}
                      alt=""
                      className="h-5 w-5 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <User size={16} className="shrink-0" aria-hidden />
                  )}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={openLoginDialog}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
                  title={t("login")}
                >
                  <LogIn size={16} className="shrink-0" />
                  <span>{t("loginShort")}</span>
                </button>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:text-white lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label={t("toggleNav")}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-x-4 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-white/10 bg-background/95 p-3 shadow-2xl backdrop-blur-2xl lg:hidden"
                >
                  <div className="flex max-h-[min(70vh,28rem)] flex-col gap-0.5 overflow-y-auto">
                    {navItems.map((item) => (
                      <a
                        key={item.href}
                        href={resolveHref(item.href)}
                        target={(item as { external?: boolean }).external ? "_blank" : undefined}
                        rel={(item as { external?: boolean }).external ? "noreferrer" : undefined}
                        onClick={(event) => {
                          if (!isAuthenticated && isProtectedAppHref(item.href)) {
                            event.preventDefault();
                            setMenuOpen(false);
                            openLoginDialog();
                            return;
                          }
                          if (!(item as { external?: boolean }).external) {
                            setMenuOpen(false);
                          }
                        }}
                        className="rounded-lg px-3 py-2.5 text-zinc-300 transition hover:bg-white/5 hover:text-white"
                      >
                        {item.label}
                      </a>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        openApiKeyDialog();
                      }}
                      className="rounded-lg px-3 py-2.5 text-left text-zinc-300 transition hover:bg-white/5 hover:text-white"
                    >
                      {t("getApiKey")}
                    </button>
                    {isAuthenticated && (
                      <a
                        href="/profile"
                        title={t("profile")}
                        onClick={() => setMenuOpen(false)}
                        className="flex min-w-0 items-center gap-2 rounded-lg px-3 py-2.5 text-zinc-300 transition hover:bg-white/5 hover:text-white"
                      >
                        {profileAvatarUrl ? (
                          <img
                            src={profileAvatarUrl}
                            alt=""
                            className="h-5 w-5 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <User size={16} className="shrink-0" aria-hidden />
                        )}
                        <span className="min-w-0 truncate">{t("profile")}</span>
                      </a>
                    )}
                    {!isAuthenticated && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          openLoginDialog();
                        }}
                        className="mt-1 flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-zinc-200 transition hover:bg-white/5 hover:text-white"
                      >
                        <LogIn size={16} />
                        {t("loginShort")}
                      </button>
                    )}
                    <a
                      href={resolveHref("#download")}
                      onClick={() => setMenuOpen(false)}
                      title={t("download")}
                      aria-label={t("download")}
                      className="mt-2 inline-flex items-center justify-center rounded-xl bg-primary p-2.5 font-semibold text-white"
                    >
                      <Download size={16} aria-hidden />
                    </a>
                    <div className="mt-3 flex justify-center">
                      <LanguageSwitcher />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.nav>
        </div>
      </header>

      <AnimatePresence>
        {loginDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-2xl sm:px-6"
          >
            <div className="relative w-full max-w-sm rounded-2xl">
              <button
                type="button"
                onClick={closeLoginDialog}
                className="absolute right-2 top-2 z-10 rounded-full bg-background-soft/90 p-2 text-zinc-400 hover:text-white sm:right-4 sm:top-4"
                aria-label={t("close")}
              >
                <X size={16} />
              </button>
              <LoginSection />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ApiKeyDialog />
      <UpgradeDialog />
    </>
  );
}
