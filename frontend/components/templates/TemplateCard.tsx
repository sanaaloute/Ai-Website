"use client";

import { useRouter } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { Download, ExternalLink, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TemplatePresetRow } from "@/lib/templates/types";
import { useTemplateDownloadTrigger } from "@/components/templates/TemplatesPageShell";
import { createAgentSession } from "@/lib/api/client";

type Props = {
  preset: TemplatePresetRow;
  /** Animation delay in seconds (omit for no animation). */
  animateDelay?: number;
};

export default function TemplateCard({ preset, animateDelay }: Props) {
  const t = useTranslations("templates");
  const tPreset = useTranslations("presets");
  const router = useRouter();
  const downloadTrigger = useTemplateDownloadTrigger();
  const title = tPreset.has(preset.id + "_title") ? tPreset(preset.id + "_title") : preset.title;
  const description = tPreset.has(preset.id + "_desc") ? tPreset(preset.id + "_desc") : preset.short_description;
  const screenshotUrl = `https://v1.screenshot.11ty.dev/${encodeURIComponent(preset.website_url)}/opengraph/`;
  const downloadApiUrl = `/api/download-repo?repoUrl=${encodeURIComponent(preset.git_repo_url)}`;
  const repoName = preset.git_repo_url.split('/').pop()?.replace(/\.git$/, '') || 'repo';

  const handleEditWithAi = async () => {
    const result = await createAgentSession({
      templateRepo: preset.git_repo_url,
      templatePrompt: preset.suggested_prompt,
    });
    if (!result.ok) {
      // Fallback: navigate without a session. The generation page will show an empty workspace.
      router.push("/generation");
      return;
    }
    const params = new URLSearchParams();
    params.set("session", result.data.sessionId);
    router.push(`/generation?${params.toString()}`);
  };

  const prefetchGenerationRoute = () => {
    try {
      router.prefetch("/generation");
    } catch {
      // Prefetch is best-effort.
    }
  };

  const cardContent = (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-background-soft/60 transition hover:border-white/15 hover:bg-background-soft/80">
      {/* Screenshot */}
      <a
        href={preset.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-3 sm:p-4"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshotUrl}
          alt={title}
          className="h-full w-full rounded-xl object-contain transition duration-700 group-hover:scale-[1.03]"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background via-background/70 to-transparent" />

        {/* Live site badge */}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-md transition group-hover:bg-primary/20">
          <ExternalLink size={11} aria-hidden />
          {new URL(preset.website_url).hostname.replace(/^www\./, "")}
        </span>

        {/* Hover overlay */}
        <div className="absolute inset-0 m-3 flex items-center justify-center rounded-xl opacity-0 transition duration-500 group-hover:opacity-100 sm:m-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/20">
            <ExternalLink size={20} className="text-white" />
          </div>
        </div>
      </a>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div>
          <h3 className="text-base font-semibold text-white sm:text-lg">
            {title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-400">
            {description}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-2">
          {downloadTrigger ? (
            <button
              type="button"
              onClick={() => downloadTrigger(preset.git_repo_url, repoName)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("download")}
            </button>
          ) : (
            <a
              href={downloadApiUrl}
              download
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("download")}
            </a>
          )}
          <button
            type="button"
            onClick={handleEditWithAi}
            onMouseEnter={prefetchGenerationRoute}
            onFocus={prefetchGenerationRoute}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-white transition hover:border-primary/40 hover:bg-primary/15"
          >
            <Wand2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("editWithAi")}
          </button>
        </div>
      </div>
    </div>
  );

  if (animateDelay !== undefined) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: animateDelay }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
}
