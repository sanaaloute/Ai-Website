"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
    >
      Sign out
    </button>
  );
}
