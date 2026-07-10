"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register" ? { email, password, name } : { email, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      toast.success(mode === "register" ? "Account created" : "Welcome back");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "register" && (
        <div>
          <label className="mb-1.5 block text-sm text-slate-300">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-sm text-slate-300">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-slate-300">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
