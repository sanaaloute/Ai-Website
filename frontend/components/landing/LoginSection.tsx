"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth/backendAuth";
import LoginEmailForm from "@/components/landing/LoginEmailForm";
import LanguageSwitcher from "@/components/landing/LanguageSwitcher";

type Mode = "login" | "register" | "forgot";

export default function LoginSection() {
  const t = useTranslations("loginSection");
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [redirectingHome, setRedirectingHome] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccessMessage, setIsSuccessMessage] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleEmail = async () => {
    if (!email || !password) {
      setMessage(t("emailRequired"));
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      let result;

      if (mode === "login") {
        result = await signInWithEmail(email, password);
      } else {
        if (password !== confirmPassword) {
          setMessage(t("passwordMismatch"));
          setLoading(false);
          return;
        }
        result = await signUpWithEmail(email, password);
      }

      if (result.error) {
        setIsSuccessMessage(false);
        setMessage(result.error);
      } else {
        if (mode === "login") {
          setIsSuccessMessage(true);
          setMessage(t("loginSuccess"));
          setRedirectingHome(true);
          window.setTimeout(() => {
            window.location.assign("/");
          }, 1100);
        } else {
          setIsSuccessMessage(true);
          setMessage(t("registerSuccess"));
          setMode("login");
        }
      }
    } catch {
      setIsSuccessMessage(false);
      setMessage(t("genericError"));
    } finally {
      setLoading(false);
    }
  };

  const subtitle =
    mode === "login"
      ? t("loginSubtitle")
      : mode === "register"
        ? t("registerSubtitle")
        : t("forgotSubtitle");

  return (
    <section className="flex w-full flex-col items-center justify-center">
      {redirectingHome && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background/95 backdrop-blur-xl"
        >
          <div className="flex flex-col items-center gap-4">
            <motion.div
              className="h-16 w-16 rounded-full border-2 border-primary/35 border-t-primary"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
            <motion.p
              initial={{ opacity: 0.4 }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              className="text-sm font-medium text-zinc-200"
            >
              {t("redirecting")}
            </motion.p>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex w-full flex-col items-center"
      >
        {/* Logo */}
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-soft-glow">
          <Sparkles size={22} />
        </div>

        {/* Title */}
        <h1 className="mt-4 text-2xl font-semibold text-white">AI-Website</h1>
        <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>

        {/* Card */}
        <div className="mt-6 w-full max-w-sm rounded-2xl border border-white/10 bg-background-soft/80 p-5 shadow-2xl backdrop-blur-2xl">
          <div className="mb-3 flex justify-end">
            <LanguageSwitcher />
          </div>
          <LoginEmailForm
            mode={mode}
            loading={loading}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            onSubmit={handleEmail}
            onToggleMode={setMode}
          />

          {message && (
            <div
              className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
                isSuccessMessage
                  ? "border-green-500/40 bg-green-500/10 text-green-200"
                  : "border-red-500/40 bg-red-500/10 text-red-200"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
}
