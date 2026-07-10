"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Lock, Mail, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/ui-store";
import { loginAdmin, forgotPassword } from "@/lib/api/client";
import { useTranslation } from "@/lib/i18n";

type View = "login" | "forgot";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const { isAuthenticated, login } = useAuthStore();
  const { addToast } = useToastStore();
  const { t } = useTranslation();

  const [view, setView] = useState<View>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login fields
  const [email, setEmail] = useState("admin@lovecode.ai");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await loginAdmin(email, password);
      login({
        id: res.admin.id,
        name: res.admin.full_name,
        email: res.admin.email,
        role: res.admin.role,
      });
      router.push(returnUrl ? decodeURIComponent(returnUrl) : "/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await forgotPassword(forgotEmail);
      setForgotSent(true);
      addToast({ title: res.message, variant: "success" });
      // In dev mode, the backend may return the raw reset token
      if (res.reset_token) {
        // eslint-disable-next-line no-console
        console.log("[DEV] Reset token:", res.reset_token);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-purple shadow-glow-cyan">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {t("login.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("login.subtitle")}
          </p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <AnimatePresence mode="wait">
            {view === "login" ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">{t("login.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("login.emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t("login.password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("login.passwordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-10"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("login.signingIn") : t("login.signIn")}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setView("forgot");
                      setError("");
                      setForgotEmail(email);
                    }}
                    className="text-muted-foreground hover:text-cyan transition-colors"
                  >
                    Forgot password?
                  </button>
                  <Link
                    href="/register"
                    className="text-cyan hover:text-cyan/80 transition-colors"
                  >
                    Create account
                  </Link>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="forgot"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleForgot}
                className="space-y-4"
              >
                <button
                  type="button"
                  onClick={() => {
                    setView("login");
                    setError("");
                    setForgotSent(false);
                  }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-cyan transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to sign in
                </button>

                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="admin@lovecode.ai"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="pl-9"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {forgotSent ? (
                  <p className="text-sm text-emerald-400">
                    If the email exists, reset instructions have been sent.
                  </p>
                ) : (
                  <>
                    {error && (
                      <p className="text-sm text-red-400">{error}</p>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? "Sending..." : "Send reset instructions"}
                    </Button>
                  </>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
