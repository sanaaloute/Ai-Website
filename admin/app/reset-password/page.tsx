"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/api/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await resetPassword(token, newPassword);
      setSuccess(true);
      // eslint-disable-next-line no-console
      console.log("[Reset Password]", res.message);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-purple shadow-glow-cyan mx-auto">
          <Heart className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Password reset
        </h1>
        <p className="text-sm text-muted-foreground">
          Your password has been reset successfully. You can now sign in with your new password.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Go to Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-purple shadow-glow-cyan">
          <Heart className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Reset Password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your new password below
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 glass rounded-2xl p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="new-password"
              type="password"
              placeholder="Min 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-9"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-9"
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading || !token}>
          {loading ? "Resetting..." : "Reset Password"}
        </Button>

        <div className="text-center text-sm">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-cyan hover:text-cyan/80 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Suspense
          fallback={
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan border-t-transparent mx-auto" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
