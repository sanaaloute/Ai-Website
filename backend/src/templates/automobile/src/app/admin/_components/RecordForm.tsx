"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export type ClientField = {
  name: string;
  type: string;
  required?: boolean;
  fk?: string;
  options?: { values?: string[] };
};

function controlKey(f: ClientField): string {
  return f.type === "relation" ? f.fk || `${f.name}Id` : f.name;
}

function initialValue(f: ClientField, initial: Record<string, unknown> | null) {
  const key = controlKey(f);
  const raw = initial ? initial[key] ?? initial[f.name] : undefined;
  if (raw === undefined || raw === null) {
    if (f.type === "bool") return false;
    return "";
  }
  if (f.type === "date") return String(raw).slice(0, 10);
  if (f.type === "json" || (f.type === "file" && typeof raw !== "string")) {
    return typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
  }
  if (f.type === "bool") return Boolean(raw);
  return String(raw);
}

export function RecordForm({
  collection,
  fields,
  initial,
  recordId,
}: {
  collection: string;
  fields: ClientField[];
  initial: Record<string, unknown> | null;
  recordId?: string;
}) {
  const router = useRouter();
  const editable = fields.filter(
    (f) => !["id", "created", "updated"].includes(f.name)
  );
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const v: Record<string, unknown> = {};
    for (const f of editable) v[controlKey(f)] = initialValue(f, initial);
    return v;
  });
  const [busy, setBusy] = useState(false);

  function set(key: string, val: unknown) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const url = recordId
        ? `/api/${collection}/${recordId}`
        : `/api/${collection}`;
      const res = await fetch(url, {
        method: recordId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed");
      }
      toast.success(recordId ? "Saved" : "Created");
      router.push(`/admin/${collection}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {editable.map((f) => {
        const key = controlKey(f);
        const label = f.type === "relation" ? `${f.name} (id)` : f.name;
        const val = values[key];
        return (
          <div key={key}>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              {label}
              {f.required && <span className="text-rose-400"> *</span>}
            </label>
            {f.type === "bool" ? (
              <input
                type="checkbox"
                checked={Boolean(val)}
                onChange={(e) => set(key, e.target.checked)}
                className="h-4 w-4"
              />
            ) : f.type === "select" && f.options?.values ? (
              <select
                value={String(val ?? "")}
                onChange={(e) => set(key, e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                <option value="">— select —</option>
                {f.options.values.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : f.type === "editor" || f.type === "json" || f.type === "file" ? (
              <textarea
                value={String(val ?? "")}
                onChange={(e) => set(key, e.target.value)}
                rows={f.type === "json" ? 6 : 3}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm"
              />
            ) : (
              <input
                type={
                  f.type === "number"
                    ? "number"
                    : f.type === "date"
                    ? "date"
                    : f.type === "email"
                    ? "email"
                    : f.type === "url"
                    ? "url"
                    : "text"
                }
                value={String(val ?? "")}
                onChange={(e) => set(key, e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            )}
          </div>
        );
      })}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? "Saving…" : recordId ? "Save changes" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-slate-700 px-5 py-2 text-sm hover:bg-slate-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
