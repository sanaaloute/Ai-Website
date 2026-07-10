"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { motion } from "framer-motion";
import {
  ArrowUp,
  Loader2,
  Shuffle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  pickRandomIdeas,
  type PromptIdea
} from "@/lib/promptIdeas";
import { listFeaturedTemplates } from "@/lib/templates/presets";
import TemplateCard from "@/components/templates/TemplateCard";
import { getAiWebsiteApiKey, createAgentSession } from "@/lib/api/client";
import { getCurrentUser, type AuthUser } from "@/lib/auth/backendAuth";
import { useLandingAuthStore } from "@/stores/landingAuthStore";

type ApiKeyCheckResult =
  | { ok: true; hasApiKey: boolean; keyPreview: string | null }
  | { ok: false; status?: number; error?: string };

async function checkApiKey(): Promise<ApiKeyCheckResult> {
  try {
    const result = await getAiWebsiteApiKey();
    if (!result.ok) {
      return { ok: false, status: result.status, error: result.error };
    }
    return {
      ok: true,
      hasApiKey: result.data.hasApiKey,
      keyPreview: result.data.keyPreview,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function preflightAuth(): Promise<{
  user: AuthUser | null;
  apiKey: ApiKeyCheckResult;
}> {
  const [user, apiKey] = await Promise.all([
    getCurrentUser().catch((err) => {
      console.error("[preflightAuth] getCurrentUser failed", err);
      return null;
    }),
    checkApiKey().catch((err) => {
      console.error("[preflightAuth] checkApiKey failed", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      } as ApiKeyCheckResult;
    }),
  ]);
  return { user, apiKey };
}

export default function PromptInput() {
  const t = useTranslations("promptInput");
  const tIdeas = useTranslations("promptIdeas");
  const rawIdeas = tIdeas.raw("list");
  const allIdeas = useMemo<PromptIdea[]>(() => {
    if (Array.isArray(rawIdeas)) return rawIdeas;
    // Defensive fallback so a malformed translation never crashes the page.
    return [];
  }, [rawIdeas]);
  const router = useRouter();
  const [value, setValue] = useState("");
  const [activeIdeaId, setActiveIdeaId] = useState<string | null>(null);
  const [shownIdeas, setShownIdeas] = useState<PromptIdea[]>(allIdeas.slice(0, 3));

  // Randomize after hydration so server and client render the same initial set.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setShownIdeas(pickRandomIdeas(allIdeas, 3));
  }, [allIdeas]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    openLoginDialog,
    openApiKeyDialog,
    setApiKeyError,
    apiKeyDialogOpen,
    apiKeyHasValue,
  } = useLandingAuthStore();

  const handleIdeaClick = (idea: PromptIdea) => {
    setValue(idea.description);
    setActiveIdeaId(idea.id);
  };

  const handleShuffleIdeas = () => {
    setShownIdeas(pickRandomIdeas(allIdeas, 3));
    setActiveIdeaId(null);
  };

  const pendingAutoSubmitRef = useRef(false);
  const preflightRef = useRef<Promise<{
    user: AuthUser | null;
    apiKey: ApiKeyCheckResult;
  }> | null>(null);
  const generationPrefetchedRef = useRef(false);

  // Preflight auth + API key as soon as the component mounts so that submitting
  // from the landing page only has to await an already-in-flight (or completed)
  // request instead of starting two serial round-trips on click.
  useEffect(() => {
    preflightRef.current = preflightAuth();
  }, []);

  const prefetchGenerationRoute = () => {
    if (generationPrefetchedRef.current) return;
    generationPrefetchedRef.current = true;
    try {
      router.prefetch("/generation");
    } catch {
      // Prefetch is best-effort; ignore unsupported-router errors.
    }
  };

  const doSubmit = async () => {
    const prompt = value.trim();
    if (!prompt) {
      setIsSubmitting(false);
      return;
    }

    setGenerationNotice(null);
    setIsSubmitting(true);

    try {
      // Create a server-side session that holds the prompt. This keeps the
      // prompt out of the URL for privacy and survives refreshes/private browsing.
      const sessionResult = await createAgentSession({ prompt });
      if (!sessionResult.ok) {
        throw new Error(sessionResult.error || 'Failed to create generation session');
      }

      try {
        window.localStorage.removeItem("ai-website:savedGeneratedProject:v1");
      } catch {
        // ignore
      }

      const params = new URLSearchParams();
      params.set("new", "1");
      params.set("session", sessionResult.data.sessionId);
      router.push(`/generation?${params.toString()}`);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setGenerationNotice(
        err instanceof Error ? err.message : t("noticeCouldNotStart")
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = value.trim();
    if (!prompt) return;

    setIsSubmitting(true);
    setGenerationNotice(null);

    try {
      // Use the preflight promise if available; otherwise run auth + API-key
      // checks in parallel. This replaces the previous serial checks and cuts
      // the blocking time before navigation.
      const { user, apiKey } = preflightRef.current
        ? await preflightRef.current
        : await preflightAuth();

      if (!user) {
        openLoginDialog();
        setGenerationNotice(t("noticeLoginRequired"));
        setIsSubmitting(false);
        return;
      }

      if (!apiKey.ok) {
        if (apiKey.status === 401) {
          openLoginDialog();
          setGenerationNotice(t("noticeLoginRequired"));
          setIsSubmitting(false);
          return;
        }
        setApiKeyError(apiKey.error || t("noticeApiKeyInvalid"));
        openApiKeyDialog(t("apiKeyDialogDescription"), false);
        pendingAutoSubmitRef.current = true;
        setGenerationNotice(t("noticeApiKeyRequired"));
        setIsSubmitting(false);
        return;
      }

      if (!apiKey.hasApiKey) {
        setApiKeyError(t("noticeApiKeyInvalid"));
        openApiKeyDialog(t("apiKeyDialogDescription"), false);
        pendingAutoSubmitRef.current = true;
        setGenerationNotice(t("noticeApiKeyRequired"));
        setIsSubmitting(false);
        return;
      }

      setApiKeyError(null);
      await doSubmit();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setGenerationNotice(
        err instanceof Error ? err.message : t("noticeCouldNotStart")
      );
    }
  };

  // Auto-retry submission after user saves their API key in the dialog.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!apiKeyDialogOpen && pendingAutoSubmitRef.current) {
      pendingAutoSubmitRef.current = false;
      if (apiKeyHasValue) {
        void doSubmit();
      } else {
        setIsSubmitting(false);
      }
    }
  }, [apiKeyDialogOpen, apiKeyHasValue]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  return (
    <section
      id="prompt"
      className="flex w-full flex-col items-center scroll-mt-28"
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex min-h-[3.75rem] items-center gap-3 rounded-2xl border border-white/10 bg-background-soft/80 px-4 py-3 shadow-sm transition focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/40">
            <input
              data-testid="landing-prompt-input"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setActiveIdeaId(null);
              }}
              onFocus={prefetchGenerationRoute}
              placeholder={t("placeholder")}
              className="min-w-0 flex-1 border-0 bg-transparent text-base text-white outline-none ring-0 placeholder:text-zinc-500"
            />
            <button
              data-testid="landing-generate-button"
              type="submit"
              disabled={!value.trim() || isSubmitting}
              aria-label={t("generate")}
              title={t("generate")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-soft-glow transition hover:bg-primary/90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} aria-hidden />
              ) : (
                <ArrowUp className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              )}
            </button>
          </div>
        </form>

        {generationNotice ? (
          <p className="mt-2 text-xs text-amber-300">{generationNotice}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {shownIdeas.map((idea) => (
            <button
              key={idea.id}
              type="button"
              title={idea.title}
              aria-label={`Use suggestion: ${idea.title}. Fills the prompt with a detailed description.`}
              onClick={() => handleIdeaClick(idea)}
              className={`max-w-full rounded-full border px-3 py-1.5 text-left text-sm transition ${
                activeIdeaId === idea.id
                  ? "border-primary/60 bg-primary/10 text-white"
                  : "border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              }`}
            >
              <span className="line-clamp-2 sm:line-clamp-1">{idea.title}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={handleShuffleIdeas}
            aria-label={t("shuffleIdeas")}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
            title={t("shuffleIdeas")}
          >
            <Shuffle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{t("shuffleIdeas")}</span>
          </button>
        </div>
      </motion.div>

      {/* Featured templates */}
      <div className="mt-16 w-full">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white">
          {t("startFromRealWebsite")}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {listFeaturedTemplates().map((preset) => (
            <TemplateCard key={preset.id} preset={preset} />
          ))}
        </div>
      </div>
    </section>
  );
}
