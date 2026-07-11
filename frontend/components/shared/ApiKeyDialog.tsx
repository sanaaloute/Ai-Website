"use client";

import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, X, Pencil, Trash2 } from "lucide-react";
import { useLandingAuthStore } from "@/stores/landingAuthStore";
import { AI_WEBSITE_API_KEY_SITE_URL } from "@/lib/ai/aiWebsiteApiKey";
import { getAiWebsiteApiKey, updateAiWebsiteApiKey, deleteAiWebsiteApiKey } from "@/lib/api/client";

export function ApiKeyDialog() {
  const store = useLandingAuthStore();

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
    closeApiKeyDialog,
    setApiKeyInput,
    setApiKeyError,
    setApiKeyLoading,
    setApiKeySaving,
    setApiKeyDeleting,
    setApiKeyHasValue,
    setApiKeyPreview,
    setApiKeyEditing,
  } = store;

  // Load API key state when dialog opens
  useEffect(() => {
    if (!apiKeyDialogOpen) return;
    let cancelled = false;
    setApiKeyLoading(true);
    getAiWebsiteApiKey()
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setApiKeyHasValue(false);
          setApiKeyPreview(null);
          setApiKeyEditing(true);
          if (result.status === 401) {
            setApiKeyError("Please log in first to save your API key.");
          } else {
            setApiKeyError(result.error || "Could not load API key state.");
          }
          return;
        }
        const has = Boolean(result.data.hasApiKey);
        setApiKeyHasValue(has);
        setApiKeyPreview(null);
        setApiKeyEditing(!has);
      })
      .catch(() => {
        if (cancelled) return;
        setApiKeyHasValue(false);
        setApiKeyPreview(null);
        setApiKeyEditing(true);
        setApiKeyError("Could not load API key state.");
      })
      .finally(() => {
        if (!cancelled) setApiKeyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    apiKeyDialogOpen,
    setApiKeyLoading,
    setApiKeyHasValue,
    setApiKeyPreview,
    setApiKeyEditing,
    setApiKeyError,
  ]);

  const saveKey = useCallback(async () => {
    const key = apiKeyInput.trim();
    if (!key) {
      setApiKeyError("Please enter an API key.");
      return;
    }
    setApiKeySaving(true);
    setApiKeyError(null);
    try {
      const result = await updateAiWebsiteApiKey(key);
      if (!result.ok) {
        setApiKeyError(result.error || "Could not save API key.");
        return;
      }
      if (!result.data.ok) {
        setApiKeyError("Could not save API key.");
        return;
      }
      setApiKeyHasValue(true);
      setApiKeyPreview(null);
      setApiKeyInput("");
      setApiKeyEditing(false);
    } catch {
      setApiKeyError("Network error while saving API key.");
    } finally {
      setApiKeySaving(false);
    }
  }, [
    apiKeyInput,
    setApiKeySaving,
    setApiKeyError,
    setApiKeyHasValue,
    setApiKeyPreview,
    setApiKeyInput,
    setApiKeyEditing,
  ]);

  const deleteKey = useCallback(async () => {
    setApiKeyDeleting(true);
    setApiKeyError(null);
    try {
      const result = await deleteAiWebsiteApiKey();
      if (!result.ok) {
        setApiKeyError(result.error || "Could not delete API key.");
        return;
      }
      if (!result.data.ok) {
        setApiKeyError("Could not delete API key.");
        return;
      }
      setApiKeyHasValue(false);
      setApiKeyPreview(null);
      setApiKeyInput("");
      setApiKeyEditing(true);
    } catch {
      setApiKeyError("Network error while deleting API key.");
    } finally {
      setApiKeyDeleting(false);
    }
  }, [
    setApiKeyDeleting,
    setApiKeyError,
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
              aria-label="Close API key dialog"
            >
              <X size={16} />
            </button>

            <div className="mb-4 pr-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-background-soft/70 px-3 py-1 text-xs text-zinc-300">
                <KeyRound size={14} className="text-glow-cyan" />
                GitHub API Provider
              </div>
              <h3 className="mt-3 text-lg font-semibold text-white">
                Set your API key
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                {apiKeyDialogDescription ??
                  "Add your GitHub API key to enable GitHub API Provider models."}
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="shared-api-key-input"
                className="text-sm font-medium text-zinc-200"
              >
                API Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="shared-api-key-input"
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={
                    apiKeyHasValue && !apiKeyEditing
                      ? (apiKeyPreview ?? "Saved key")
                      : "Paste your GitHub API key"
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
                      aria-label="Edit API key"
                      title="Edit API key"
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
                      aria-label="Delete API key"
                      title="Delete API key"
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
                {apiKeySaving ? "Saving..." : "Save API Key"}
              </button>
              <a
                href={AI_WEBSITE_API_KEY_SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-background-soft/70 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-glow-cyan/60 hover:text-white"
              >
                Get API Key
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
