"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { LanguageToggle } from "@/components/language-toggle";
import { useAuth } from "@/components/auth-provider";
import { useLanguage } from "@/lib/i18n/language-provider";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { translations: t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t.login.fillFields);
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t.login.welcomeToast);
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.login.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
              D
            </div>
            <h1 className="text-2xl font-bold text-slate-100">{t.login.welcomeBack}</h1>
            <p className="text-sm text-slate-400 mt-1">{t.login.signInSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-slate-300">{t.login.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 bg-slate-900/80 border-slate-700 text-slate-200 focus:border-cyan-500/50"
                placeholder={t.login.emailPlaceholder}
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-300">{t.login.password}</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 bg-slate-900/80 border-slate-700 text-slate-200 focus:border-cyan-500/50"
                placeholder={t.login.passwordPlaceholder}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              {t.login.signIn}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              {t.login.dontHaveAccount}{" "}
              <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">
                {t.login.signUpLink}
              </Link>
            </p>
          </div>

          <div className="mt-4 flex justify-center">
            <LanguageToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
