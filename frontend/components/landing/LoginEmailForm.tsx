"use client";

import { Mail, Lock, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePasswordReset } from "@/hooks/usePasswordReset";

type Mode = "login" | "register" | "forgot";

interface LoginEmailFormProps {
  mode: Mode;
  loading: boolean;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  onSubmit: () => void;
  onToggleMode: (mode: Mode) => void;
}

export default function LoginEmailForm({
  mode,
  loading,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onSubmit,
  onToggleMode,
}: LoginEmailFormProps) {
  const t = useTranslations("loginForm");
  const { loading: resetLoading, sent: resetSent, reset } = usePasswordReset();

  const canSubmit =
    !loading &&
    !!email &&
    (mode === "forgot" || !!password) &&
    (mode !== "register" || !!confirmPassword);

  const handleSubmit = () => {
    if (mode === "forgot") {
      reset(email);
      return;
    }
    onSubmit();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-200">{t("emailLabel")}</label>
        <div className="relative">
          <Mail
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className="w-full rounded-xl border border-white/10 bg-background/60 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-primary/50"
          />
        </div>
      </div>

      {mode !== "forgot" && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-200">
            {t("passwordLabel")}
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-background/60 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-primary/50"
            />
          </div>
        </div>
      )}

      {mode === "register" && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-200">
            {t("confirmPasswordLabel")}
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-background/60 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-primary/50"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || resetLoading}
        className="mt-1 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
      >
        {loading || resetLoading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            {t("pleaseWait")}
          </span>
        ) : mode === "login" ? (
          t("signIn")
        ) : mode === "register" ? (
          t("createAccount")
        ) : (
          t("sendResetLink")
        )}
      </button>

      {resetSent && mode === "forgot" && (
        <p className="text-center text-sm text-glow-cyan">
          {t("resetSentMessage")}
        </p>
      )}

      <div className="flex items-center justify-between text-sm">
        {mode === "login" ? (
          <>
            <button
              type="button"
              onClick={() => onToggleMode("forgot")}
              className="text-zinc-400 transition hover:text-white"
            >
              {t("forgotPassword")}
            </button>
            <button
              type="button"
              onClick={() => onToggleMode("register")}
              className="font-medium text-primary transition hover:text-white"
            >
              {t("createAccount")}
            </button>
          </>
        ) : mode === "register" ? (
          <>
            <span className="text-zinc-400">{t("alreadyHaveAccount")}</span>
            <button
              type="button"
              onClick={() => onToggleMode("login")}
              className="font-medium text-primary transition hover:text-white"
            >
              {t("signInButton")}
            </button>
          </>
        ) : (
          <>
            <span className="text-zinc-400">{t("rememberPassword")}</span>
            <button
              type="button"
              onClick={() => onToggleMode("login")}
              className="font-medium text-primary transition hover:text-white"
            >
              {t("signInButton")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
