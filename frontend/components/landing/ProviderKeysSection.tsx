"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Pencil, Trash2, Check, ExternalLink } from "lucide-react";
import {
  getLlmProviders,
  getProviderKeys,
  saveProviderKey,
  deleteProviderKey,
  setActiveProvider,
  type LlmProviderInfo,
} from "@/lib/api/client";

/**
 * Profile card that lets the user manage one API key per LLM provider and
 * choose the active provider. When only one key exists the backend marks it
 * active automatically; with several keys the active one is tried first and
 * the others act as fallbacks.
 */
export default function ProviderKeysSection() {
  const [providers, setProviders] = useState<LlmProviderInfo[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [activeProvider, setActiveProviderState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [providersResult, keysResult] = await Promise.all([
        getLlmProviders(),
        getProviderKeys(),
      ]);
      if (providersResult.ok) setProviders(providersResult.data.providers ?? []);
      if (keysResult.ok) {
        const map: Record<string, string> = {};
        for (const k of keysResult.data.keys ?? []) map[k.provider] = k.keyPreview;
        setPreviews(map);
        setActiveProviderState(keysResult.data.activeProvider ?? null);
      } else {
        setError(keysResult.error ?? "Could not load provider keys.");
      }
    } catch {
      setError("Network error loading provider keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleSave = async (providerId: string) => {
    const key = keyInput.trim();
    if (!key) {
      setError("Please enter an API key.");
      return;
    }
    setBusyProvider(providerId);
    setError(null);
    try {
      const result = await saveProviderKey(providerId, key);
      if (!result.ok) {
        setError(result.error ?? "Could not save API key.");
        return;
      }
      setKeyInput("");
      setEditingProvider(null);
      await load();
    } catch {
      setError("Network error while saving API key.");
    } finally {
      setBusyProvider(null);
    }
  };

  const handleDelete = async (providerId: string) => {
    setBusyProvider(providerId);
    setError(null);
    try {
      const result = await deleteProviderKey(providerId);
      if (!result.ok) {
        setError(result.error ?? "Could not delete API key.");
        return;
      }
      await load();
    } catch {
      setError("Network error while deleting API key.");
    } finally {
      setBusyProvider(null);
    }
  };

  const handleSetActive = async (providerId: string) => {
    setBusyProvider(providerId);
    setError(null);
    try {
      const result = await setActiveProvider(providerId);
      if (!result.ok) {
        setError(result.error ?? "Could not set active provider.");
        return;
      }
      setActiveProviderState(providerId);
    } catch {
      setError("Network error while setting active provider.");
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-background-soft/90 p-5 shadow-[0_0_40px_rgba(15,23,42,0.9)] backdrop-blur-xl">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <KeyRound size={18} className="text-glow-cyan" />
        AI Providers
      </h2>
      <p className="mt-2 text-xs text-zinc-500">
        Add an API key for each provider you want to use. The active provider is
        used for generation.
      </p>

      {error && (
        <p className="mt-3 rounded-xl border border-amber-500/35 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin text-glow-cyan" />
          Loading providers…
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {providers.map((provider) => {
            const preview = previews[provider.id];
            const hasKey = Boolean(preview);
            const isActive = activeProvider === provider.id;
            const isEditing = editingProvider === provider.id;
            const busy = busyProvider === provider.id;

            return (
              <li
                key={provider.id}
                className="rounded-xl border border-white/10 bg-background/50 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {provider.label}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                        <Check size={10} />
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-400">
                    {hasKey ? preview : "Not set"}
                  </span>
                </div>

                {isEditing && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="password"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder={`Paste your ${provider.label} API key`}
                      disabled={busy}
                      className="h-10 w-full rounded-xl border border-white/15 bg-background-soft/70 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-glow-cyan/60 disabled:opacity-70"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSave(provider.id)}
                      disabled={busy || !keyInput.trim()}
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-primary via-primary-soft to-primary-accent px-3 text-xs font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProvider(null);
                        setKeyInput("");
                        setError(null);
                      }}
                      disabled={busy}
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-background-soft/70 px-3 text-xs font-medium text-zinc-300 transition hover:text-white disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!isActive && hasKey && (
                    <button
                      type="button"
                      onClick={() => void handleSetActive(provider.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-background-soft/70 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:border-glow-cyan/60 hover:text-white disabled:opacity-50"
                    >
                      Set active
                    </button>
                  )}
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProvider(provider.id);
                        setKeyInput("");
                        setError(null);
                      }}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-background-soft/70 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:border-glow-cyan/60 hover:text-white disabled:opacity-50"
                    >
                      <Pencil size={12} />
                      {hasKey ? "Edit key" : "Add key"}
                    </button>
                  )}
                  {hasKey && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(provider.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-400/30 bg-red-950/30 px-2.5 py-1.5 text-[11px] font-medium text-red-200 transition hover:border-red-300/60 hover:text-red-100 disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  )}
                  <a
                    href={provider.keySiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-background-soft/70 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:border-glow-cyan/60 hover:text-white"
                  >
                    <ExternalLink size={12} />
                    Get key
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
