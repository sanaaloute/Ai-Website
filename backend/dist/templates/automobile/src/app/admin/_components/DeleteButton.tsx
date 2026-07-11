"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function DeleteButton({
  collection,
  id,
}: {
  collection: string;
  id: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/${collection}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete record");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="text-sm text-rose-400 hover:text-rose-300 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
