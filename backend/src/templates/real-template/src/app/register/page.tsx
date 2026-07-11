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
import { Loader2, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { translations: t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t.register.fillRequired);
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t.register.passwordsDoNotMatch);
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name || undefined);
      toast.success(t.register.accountCreated);
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.register.registrationFailed);
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
            <h1 className="text-2xl font-bold text-slate-100">{t.register.createAccount}</h1>
            <p className="text-sm text-slate-400 mt-1">{t.register.joinCommunity}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name" className="text-slate-300">{t.register.name}</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 bg-slate-900/80 border-slate-700 text-slate-200 focus:border-cyan-500/50"
                placeholder={t.register.namePlaceholder}
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-slate-300">{t.register.email}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 bg-slate-900/80 border-slate-700 text-slate-200 focus:border-cyan-500/50"
                placeholder={t.register.emailPlaceholder}
                required
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-300">{t.register.password}</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 bg-slate-900/80 border-slate-700 text-slate-200 focus:border-cyan-500/50"
                placeholder={t.register.passwordPlaceholder}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-slate-300">{t.register.confirmPassword}</Label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 bg-slate-900/80 border-slate-700 text-slate-200 focus:border-cyan-500/50"
                placeholder={t.register.confirmPasswordPlaceholder}
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
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {t.register.createAccountBtn}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              {t.register.alreadyHaveAccount}{" "}
              <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
                {t.register.signInLink}
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
