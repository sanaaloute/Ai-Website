"use client";

import { useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, X, Pencil, Trash2 } from "lucide-react";
import { useLandingAuthStore } from "@/stores/landingAuthStore";
import { AI_WEBSITE_API_KEY_SITE_URL } from "@/lib/ai/aiWebsiteApiKey";
import {
  getLlmProviders,
  getProviderKeys,
  saveProviderKey,
  deleteProviderKey,
  type LlmProviderInfo,
} from "@/lib/api/client";

const FALLBACK_PROVIDERS: LlmProviderInfo[] = [
  { id: "tokenfree", label: "TokenFree", keySiteUrl: AI_WEBSITE_API_KEY_SITE_URL, models: [] },
  { id: "openai", label: "OpenAI", keySiteUrl: "https://platform.openai.com/api-keys", models: [] },
  { id: "openrouter", label: "OpenRouter", keySiteUrl: "https://openrouter.ai/keys", models: [] },
  { id: "groq", label: "Groq", keySiteUrl: "https://console.groq.com/keys", models: [] },
  { id: "ollama_cloud", label: "Ollama Cloud", keySiteUrl: "https://ollama.com/settings/keys", models: [] },
  { id: "kie_ai", label: "kie.ai", keySiteUrl: "https://kie.ai/api-key", models: [] },
];

export function ApiKeyDialog() {
  const store = useLandingAuthStore();
  const t = useTranslations("generation");

  const {
    apiKeyDialogOpen,
    apiKeyDialogDescription,
    apiKeyDialogShowActions,
    apiKeyInput,
    apiKeyError,
    apiKeyLoading,
    apiKeySaving,
    apiKeyDeleting,
    apiKeyHasValue,
    apiKeyPreview,
    apiKeyEditing,
    apiKeyProvider,
    apiKeyProviders,
    apiKeyPreviews,
    apiKeyActiveProvider,
    closeApiKeyDialog,
    setApiKeyInput,
    setApiKeyError,
    setApiKeyLoading,
    setApiKeySaving,
    setApiKeyDeleting,
    setApiKeyHasValue,
    setApiKeyPreview,
    setApiKeyEditing,
    setApiKeyProvider,
    setApiKeyProviders,
    setApiKeyPreviews,
    setApiKeyActiveProvider,
  } = store;

  const providers = apiKeyProviders.length > 0 ? apiKeyProviders : FALLBACK_PROVIDERS;
  const currentProvider =
    providers.find((p) => p.id === apiKeyProvider) ?? providers[0];

  // Load providers + saved keys when the dialog opens
  useEffect(() => {
    if (!apiKeyDialogOpen) return;
    let cancelled = false;
    setApiKeyLoading(true);
    Promise.all([getLlmProviders(), getProviderKeys()])
      .then(([providersResult, keysResult]) => {
        if (cancelled) return;
        if (providersResult.ok && providersResult.data.providers?.length) {
          setApiKeyProviders(providersResult.data.providers);
        }
        if (!keysResult.ok) {
          setApiKeyHasValue(false);
          setApiKeyPreview(null);
          setApiKeyEditing(true);
          if (keysResult.status === 401) {
            setApiKeyError(t("apiKey.loginFirst"));
          } else {
            setApiKeyError(keysResult.error || t("apiKey.loadError"));
          }
          return;
        }
        const previews: Record<string, string> = {};
        for (const k of keysResult.data.keys ?? []) {
          previews[k.provider] = k.keyPreview;
        }
        setApiKeyPreviews(previews);
        setApiKeyActiveProvider(keysResult.data.activeProvider ?? null);

        // Select the active provider (fall back to the current selection).
        const selected = keysResult.data.activeProvider ?? apiKeyProvider;
        setApiKeyProvider(selected);
        const has = Boolean(previews[selected]);
        setApiKeyHasValue(has);
        setApiKeyPreview(previews[selected] ?? null);
        setApiKeyEditing(!has);
      })
      .catch(() => {
        if (cancelled) return;
        setApiKeyHasValue(false);
        setApiKeyPreview(null);
        setApiKeyEditing(true);
        setApiKeyError(t("apiKey.loadError"));
      })
      .finally(() => {
        if (!cancelled) setApiKeyLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKeyDialogOpen]);

  const selectProvider = useCallback(
    (providerId: string) => {
      setApiKeyProvider(providerId);
      const has = Boolean(apiKeyPreviews[providerId]);
      setApiKeyHasValue(has);
      setApiKeyPreview(apiKeyPreviews[providerId] ?? null);
      setApiKeyInput("");
      setApiKeyError(null);
      setApiKeyEditing(!has);
    },
    [
      apiKeyPreviews,
      setApiKeyProvider,
      setApiKeyHasValue,
      setApiKeyPreview,
      setApiKeyInput,
      setApiKeyError,
      setApiKeyEditing,
    ],
  );

  const saveKey = useCallback(async () => {
    const key = apiKeyInput.trim();
    if (!key) {
      setApiKeyError(t("apiKey.enterKey"));
      return;
    }
    setApiKeySaving(true);
    setApiKeyError(null);
    try {
      const result = await saveProviderKey(apiKeyProvider, key);
      if (!result.ok) {
        setApiKeyError(result.error || t("apiKey.saveError"));
        return;
      }
      if (!result.data.ok) {
        setApiKeyError(t("apiKey.saveError"));
        return;
      }
      const preview = result.data.keyPreview;
      setApiKeyPreviews({ ...apiKeyPreviews, [apiKeyProvider]: preview });
      setApiKeyActiveProvider(result.data.activeProvider ?? null);
      setApiKeyHasValue(true);
      setApiKeyPreview(preview);
      setApiKeyInput("");
      setApiKeyEditing(false);
    } catch {
      setApiKeyError(t("apiKey.saveNetworkError"));
    } finally {
      setApiKeySaving(false);
    }
  }, [
    apiKeyInput,
    apiKeyProvider,
    apiKeyPreviews,
    t,
    setApiKeySaving,
    setApiKeyError,
    setApiKeyPreviews,
    setApiKeyActiveProvider,
    setApiKeyHasValue,
    setApiKeyPreview,
    setApiKeyInput,
    setApiKeyEditing,
  ]);

  const deleteKey = useCallback(async () => {
    setApiKeyDeleting(true);
    setApiKeyError(null);
    try {
      const result = await deleteProviderKey(apiKeyProvider);
      if (!result.ok) {
        setApiKeyError(result.error || t("apiKey.deleteError"));
        return;
      }
      if (!result.data.ok) {
        setApiKeyError(t("apiKey.deleteError"));
        return;
      }
      const next = { ...apiKeyPreviews };
      delete next[apiKeyProvider];
      setApiKeyPreviews(next);
      setApiKeyActiveProvider(result.data.activeProvider ?? null);
      setApiKeyHasValue(false);
      setApiKeyPreview(null);
      setApiKeyInput("");
      setApiKeyEditing(true);
    } catch {
      setApiKeyError(t("apiKey.deleteNetworkError"));
    } finally {
      setApiKeyDeleting(false);
    }
  }, [
    apiKeyProvider,
    apiKeyPreviews,
    t,
    setApiKeyDeleting,
    setApiKeyError,
    setApiKeyPreviews,
    setApiKeyActiveProvider,
    setApiKeyHasValue,
    setApiKeyPreview,
    setApiKeyInput,
    setApiKeyEditing,
  ]);

  return (
    <AnimatePresence>
      {apiKeyDialogOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-2xl sm:px-6"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-background/95 p-5 shadow-2xl">
            <button
              type="button"
              onClick={closeApiKeyDialog}
              className="absolute right-2 top-2 rounded-full bg-background-soft/90 p-2 text-zinc-400 hover:text-white sm:right-4 sm:top-4"
              aria-label={t("apiKey.closeAria")}
            >
              <X size={16} />
            </button>

            <div className="mb-4 pr-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-background-soft/70 px-3 py-1 text-xs text-zinc-300">
                <KeyRound size={14} className="text-glow-cyan" />
                {t("apiKey.badge")}
              </div>
              <h3 className="mt-3 text-lg font-semibold text-white">
                {t("apiKey.title")}
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                {apiKeyDialogDescription ??
                  t("apiKey.defaultDescription")}
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="shared-api-key-provider"
                className="text-sm font-medium text-zinc-200"
              >
                {t("apiKey.providerLabel")}
              </label>
              <select
                id="shared-api-key-provider"
                value={apiKeyProvider}
                onChange={(e) => selectProvider(e.target.value)}
                disabled={apiKeyLoading || apiKeySaving || apiKeyDeleting}
                className="h-11 w-full rounded-xl border border-white/15 bg-background-soft/70 px-3 text-sm text-white outline-none focus:border-glow-cyan/60 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id} className="bg-background text-white">
                    {p.label}
                    {apiKeyPreviews[p.id] ? t("apiKey.keySavedSuffix") : ""}
                    {apiKeyActiveProvider === p.id ? t("apiKey.activeSuffix") : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 space-y-2">
              <label
                htmlFor="shared-api-key-input"
                className="text-sm font-medium text-zinc-200"
              >
                {t("apiKey.keyLabel")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="shared-api-key-input"
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={
                    apiKeyHasValue && !apiKeyEditing
                      ? (apiKeyPreview ?? t("apiKey.savedKeyPlaceholder"))
                      : t("apiKey.pastePlaceholder", {
                          provider: currentProvider?.label ?? t("apiKey.providerFallback"),
                        })
                  }
                  disabled={
                    apiKeyLoading ||
                    apiKeySaving ||
                    (!apiKeyEditing && apiKeyHasValue)
                  }
                  className="h-11 w-full rounded-xl border border-white/15 bg-background-soft/70 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-glow-cyan/60 disabled:cursor-not-allowed disabled:opacity-70"
                />
                {apiKeyDialogShowActions && (
                  <>
                    <button
                      type="button"
                      aria-label={t("apiKey.editAria")}
                      title={t("apiKey.editAria")}
                      onClick={() => {
                        setApiKeyEditing(true);
                        setApiKeyError(null);
                      }}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-background-soft/70 text-zinc-300 transition hover:border-glow-cyan/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={
                        apiKeyLoading || apiKeySaving || apiKeyDeleting
                      }
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label={t("apiKey.deleteAria")}
                      title={t("apiKey.deleteAria")}
                      onClick={() => void deleteKey()}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-400/30 bg-red-950/30 text-red-200 transition hover:border-red-300/60 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={
                        apiKeyLoading ||
                        apiKeySaving ||
                        apiKeyDeleting ||
                        !apiKeyHasValue
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {apiKeyError && (
              <p className="mt-2 text-xs text-amber-300">{apiKeyError}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void saveKey()}
                disabled={
                  apiKeyLoading ||
                  apiKeySaving ||
                  apiKeyDeleting ||
                  !apiKeyEditing ||
                  !apiKeyInput.trim()
                }
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary via-primary-soft to-primary-accent px-4 py-2.5 text-sm font-semibold text-white shadow-soft-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {apiKeySaving ? t("apiKey.saving") : t("apiKey.save")}
              </button>
              <a
                href={currentProvider?.keySiteUrl ?? AI_WEBSITE_API_KEY_SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-background-soft/70 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-glow-cyan/60 hover:text-white"
              >
                {t("apiKey.getKey")}
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
