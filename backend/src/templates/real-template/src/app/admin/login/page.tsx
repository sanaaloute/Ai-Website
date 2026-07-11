"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { LanguageToggle } from "@/components/language-toggle";
import { useAuth } from "@/components/auth-provider";
import { useLanguage } from "@/lib/i18n/language-provider";
import { toast } from "sonner";
import { Loader2, LogIn, Shield, ArrowLeft } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, login, logout } = useAuth();
  const { translations: t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in as admin, go to dashboard
  useEffect(() => {
    if (user?.role === "admin") {
      router.replace("/admin");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t.login.fillFields);
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      // After login, the user state will update and the useEffect above will redirect admins
      // But we also check here for immediate feedback
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.login.loginFailed);
      setLoading(false);
    }
  };

  // If a non-admin is logged in, show access denied and logout option
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
        <div className="w-full max-w-md">
          <div className="glass-card rounded-2xl p-8 sm:p-10 text-center">
            <Shield className="w-12 h-12 text-violet-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-100 mb-2">Access Denied</h1>
            <p className="text-slate-400 mb-6">
              This area is restricted to administrators.
            </p>
            <Button onClick={logout} variant="outline" className="w-full">
              Sign Out
            </Button>
            <Link
              href="/"
              className="mt-4 inline-flex items-center text-sm text-cyan-400 hover:text-cyan-300"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white mx-auto mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Admin Login</h1>
            <p className="text-sm text-slate-400 mt-1">
              DaaCoo Dashboard Access
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                {t.login.email}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t.login.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                {t.login.password}
              </Label>
              <PasswordInput
                id="password"
                placeholder={t.login.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-900/50 border-slate-700 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              {t.login.signIn}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Store
            </Link>
          </div>

          <div className="mt-4 flex justify-center">
            <LanguageToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
