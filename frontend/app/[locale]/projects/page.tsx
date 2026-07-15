'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes,
  ExternalLink,
  FolderOpen,
  Globe,
  LayoutTemplate,
  Loader2,
  LogIn,
  Rocket,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import type { CloudProjectListItem } from '@/lib/generation/types';
import { AppLoaderFullscreen } from '@/components/shared/AppLoader';
import { listProjects, createSandbox, openProject, deleteProject as apiDeleteProject, killSandbox } from '@/lib/api/client';
import { useLandingAuthStore } from '@/stores/landingAuthStore';

type FilterTab = 'all' | 'deployed' | 'undeployed';
type OpeningStatusKey = 'sandbox' | 'files' | 'finalize';

const CURRENT_SESSION_PROJECT_KEY = 'ai-website:currentProjectId:v1';
const LAST_SAVED_PROJECT_KEY = 'ai-website:lastSavedProjectId:v1';

type RelativeTimeTranslate = (key: string, values?: Record<string, number>) => string;

function formatRelativeTime(
  updatedAt: number | undefined,
  t: RelativeTimeTranslate,
  locale: string
): string {
  if (!updatedAt) return t('justNow');
  const diff = Date.now() - updatedAt;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('justNow');
  if (minutes < 60) return t('minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t('daysAgo', { count: days });
  const date = new Date(updatedAt);
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Opening-project loading screen                                     */
/* ------------------------------------------------------------------ */

function OpeningProjectLoader({
  title,
  subtitle,
  status,
  steps,
  activeStep,
}: {
  title: string;
  subtitle: string;
  status: string;
  steps: { label: string; key: string }[];
  activeStep: number;
}) {
  return (
    <AppLoaderFullscreen
      title={title}
      subtitle={subtitle}
      status={status}
      steps={steps}
      activeStep={activeStep}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function ProjectsPage() {
  const router = useRouter();
  const t = useTranslations('loginRequired');
  const tp = useTranslations('projects');
  const locale = useLocale();
  const isAuthenticated = useLandingAuthStore((s) => s.isAuthenticated);
  const authChecked = useLandingAuthStore((s) => s.authChecked);
  const openLoginDialog = useLandingAuthStore((s) => s.openLoginDialog);
  const [projects, setProjects] = useState<CloudProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingProjectId, setOpeningProjectId] = useState<string | null>(null);
  const [openingStatusKey, setOpeningStatusKey] = useState<OpeningStatusKey>('sandbox');
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listProjects();
      if (!result.ok) {
        setError(result.error || tp('errorLoadProjects'));
        setProjects([]);
        return;
      }
      if (!result.data.success) {
        setError(result.data.error || tp('errorLoadProjects'));
        setProjects([]);
        return;
      }
      const items = Array.isArray(result.data.projects) ? result.data.projects : [];
      items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setProjects(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : tp('errorLoadProjects'));
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [tp]);

  // Initial data fetch on mount; loadProjects sets state after the async call resolves.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openProjectInGeneration = useCallback(
    async (project: CloudProjectListItem) => {
      if (openingProjectId) return;
      setOpeningProjectId(project.projectId);
      setError(null);
      let didNavigate = false;
      try {
        setOpeningStatusKey('sandbox');
        const sandboxResult = await createSandbox();
        if (!sandboxResult.ok) {
          throw new Error(sandboxResult.error || tp('errorCreateSandbox'));
        }
        if (!sandboxResult.data.sandboxId) {
          throw new Error(tp('errorCreateSandbox'));
        }

        setOpeningStatusKey('files');
        const openResult = await openProject(project.projectId, sandboxResult.data.sandboxId);
        if (!openResult.ok) {
          throw new Error(openResult.error || tp('errorOpenProject'));
        }

        const restoredCount = openResult.data?.restoredCount ?? 0;
        if (restoredCount === 0) {
          // Don't spin up (and leak) a sandbox for a project that has no saved files.
          void killSandbox(sandboxResult.data.sandboxId).catch(() => {});
          throw new Error(tp('errorNoSavedFiles'));
        }

        try {
          window.sessionStorage.setItem(CURRENT_SESSION_PROJECT_KEY, project.projectId);
          window.sessionStorage.setItem(LAST_SAVED_PROJECT_KEY, project.projectId);
        } catch {
          // Ignore storage errors.
        }

        setOpeningStatusKey('finalize');
        const params = new URLSearchParams({
          sandbox: sandboxResult.data.sandboxId,
          projectId: project.projectId,
          projectName: project.projectName || '',
        });
        didNavigate = true;
        router.push(`/generation?${params.toString()}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : tp('errorOpenGeneric'));
        setOpeningStatusKey('sandbox');
      } finally {
        if (!didNavigate) {
          setOpeningProjectId(null);
        }
      }
    },
    [openingProjectId, router, tp]
  );

  const deleteProject = useCallback(
    async (project: CloudProjectListItem) => {
      const projectId = project.projectId;
      if (!projectId || deleteBusyId) return;
      const readableName = (project.projectName || tp('untitledProject')).trim() || tp('untitledProject');
      const shouldDelete = window.confirm(tp('confirmDelete', { name: readableName }));
      if (!shouldDelete) return;

      setDeleteBusyId(projectId);
      try {
        const result = await apiDeleteProject(projectId);
        if (!result.ok) {
          throw new Error(result.error || tp('errorDeleteProject'));
        }
        if (!result.data.success) {
          throw new Error(result.data.error || tp('errorDeleteProject'));
        }
        setProjects((prev) => prev.filter((p) => p.projectId !== projectId));
      } catch (e) {
        setError(e instanceof Error ? e.message : tp('errorDeleteProject'));
      } finally {
        setDeleteBusyId(null);
      }
    },
    [deleteBusyId, tp]
  );

  const filteredProjects = useMemo(() => {
    const sorted = [...projects].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (activeTab === 'deployed') return sorted.filter((p) => p.vercelDomainUrl);
    if (activeTab === 'undeployed') return sorted.filter((p) => !p.vercelDomainUrl);
    return sorted;
  }, [projects, activeTab]);

  const stats = useMemo(() => {
    const total = projects.length;
    const deployed = projects.filter((p) => p.vercelDomainUrl).length;
    return { total, deployed, undeployed: total - deployed };
  }, [projects]);

  const hasProjects = projects.length > 0;
  const hasFiltered = filteredProjects.length > 0;
  const openingProject = projects.find((p) => p.projectId === openingProjectId);

  const openingSteps = [
    { label: tp('stepSandbox'), key: 'sandbox' },
    { label: tp('stepFiles'), key: 'files' },
    { label: tp('stepFinalize'), key: 'finalize' },
  ];
  const openingActiveStep =
    openingStatusKey === 'sandbox' ? 0 : openingStatusKey === 'files' ? 1 : 2;
  const openingStatusLabel =
    openingStatusKey === 'sandbox'
      ? tp('statusSandbox')
      : openingStatusKey === 'files'
        ? tp('statusFiles')
        : tp('statusFinalize');



  return (
    <>
      {/* Full-screen loader overlay when opening a project */}
      <AnimatePresence>
        {openingProjectId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <OpeningProjectLoader
              title={tp('openingTitle')}
              subtitle={tp('openingSubtitle', {
                projectName: openingProject?.projectName || tp('defaultProjectName'),
              })}
              status={openingStatusLabel}
              steps={openingSteps}
              activeStep={openingActiveStep}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
        <Navbar />
        <div aria-hidden className="h-20 sm:h-[5.25rem]" />

        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 pb-20 pt-6 sm:px-4 sm:pt-10 md:px-8 lg:px-10">
          {!authChecked || loading ? (
            <div className="flex flex-1 flex-col items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-glow-cyan" />
              <p className="mt-4 text-sm text-zinc-400">{tp('loading')}</p>
            </div>
          ) : !isAuthenticated ? (
            <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 ring-1 ring-white/10">
                <LogIn size={36} className="text-zinc-500" />
              </div>
              <h2 className="mt-6 text-xl font-semibold text-white">{t('title')}</h2>
              <p className="mt-2 max-w-sm text-sm text-zinc-400">
                {t('description')}
              </p>
              <button
                type="button"
                onClick={() => openLoginDialog()}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-glow-cyan/45 hover:bg-white/10"
              >
                <LogIn size={16} />
                {t('loginButton')}
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <header className="mb-8">
            {/* Centered title + CTAs */}
            <div className="flex flex-col items-center text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                {tp('title')}
              </h1>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/generation?new=1"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-glow-cyan/45 hover:bg-white/10"
                >
                  <Wand2 className="h-4 w-4" aria-hidden />
                  {tp('startNewProject')}
                </Link>
                <Link
                  href="/templates"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-glow-purple/40 hover:bg-white/5 hover:text-white"
                >
                  <LayoutTemplate className="h-4 w-4" aria-hidden />
                  {tp('exploreTemplates')}
                </Link>
              </div>
            </div>

            {/* Stats + Tabs on one row with space between */}
            {hasProjects && (
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Stats */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background-soft/60 px-4 py-1.5 text-xs text-zinc-400">
                    <Boxes size={13} className="text-glow-cyan" />
                    <span className="font-semibold text-white">{stats.total}</span> {tp('statTotal')}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-4 py-1.5 text-xs text-zinc-400">
                    <Globe size={13} className="text-emerald-400" />
                    <span className="font-semibold text-emerald-300">{stats.deployed}</span> {tp('statLive')}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background-soft/60 px-4 py-1.5 text-xs text-zinc-400">
                    <Rocket size={13} className="text-amber-400" />
                    <span className="font-semibold text-amber-300">{stats.undeployed}</span> {tp('statDraft')}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-background-soft/40 p-1">
                  {([
                    { key: 'all', label: tp('tabAll'), count: stats.total },
                    { key: 'deployed', label: tp('tabLive'), count: stats.deployed },
                    { key: 'undeployed', label: tp('tabDraft'), count: stats.undeployed },
                  ] as { key: FilterTab; label: string; count: number }[]).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`relative rounded-lg px-4 py-2 text-sm font-medium transition ${
                        activeTab === tab.key
                          ? 'text-white'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {activeTab === tab.key && (
                        <motion.div
                          layoutId="projects-tab"
                          className="absolute inset-0 rounded-lg bg-white/10"
                          transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        {tab.label}
                        <span
                          className={`rounded-full px-1.5 py-0 text-[10px] ${
                            activeTab === tab.key
                              ? 'bg-white/15 text-zinc-200'
                              : 'bg-white/5 text-zinc-600'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </header>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">
              <X size={16} className="shrink-0 text-red-400" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-glow-cyan" />
              <p className="mt-4 text-sm text-zinc-400">{tp('loading')}</p>
            </div>
          ) : !hasProjects ? (
            <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 ring-1 ring-white/10">
                <Boxes size={36} className="text-zinc-500" />
              </div>
              <h2 className="mt-6 text-xl font-semibold text-white">{tp('emptyTitle')}</h2>
              <p className="mt-2 max-w-sm text-sm text-zinc-400">
                {tp('emptyDescription')}
              </p>
              <Link
                href="/generation?new=1"
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-glow-cyan/45 hover:bg-white/10"
              >
                <Wand2 className="h-4 w-4" aria-hidden />
                {tp('emptyCta')}
              </Link>
            </div>
          ) : (
            <>
              {!hasFiltered ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                    {activeTab === 'deployed' ? (
                      <Globe size={28} className="text-zinc-500" />
                    ) : (
                      <Rocket size={28} className="text-zinc-500" />
                    )}
                  </div>
                  <p className="mt-4 text-base font-medium text-white">
                    {activeTab === 'deployed'
                      ? tp('noLiveTitle')
                      : tp('noDraftTitle')}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {activeTab === 'deployed'
                      ? tp('noLiveDescription')
                      : tp('noDraftDescription')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProjects.map((project) => {
                    const isOpening = openingProjectId === project.projectId;
                    const isDeleting = deleteBusyId === project.projectId;
                    const isDeployed = Boolean(project.vercelDomainUrl);
                    const screenshotUrl = isDeployed
                      ? `https://v1.screenshot.11ty.dev/${encodeURIComponent(project.vercelDomainUrl!)}/opengraph/`
                      : null;

                    return (
                      <article
                        key={project.projectId}
                        className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-background-soft/60 shadow-[0_0_60px_rgba(15,23,42,0.9)] backdrop-blur-xl transition duration-500 hover:border-glow-cyan/30 hover:shadow-[0_0_80px_rgba(34,211,238,0.12)]"
                      >
                        {/* Image / Screenshot area */}
                        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
                          {isDeployed && screenshotUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={screenshotUrl}
                                alt={project.projectName}
                                className="h-full w-full object-contain p-3 sm:p-4 transition duration-700 group-hover:scale-[1.03]"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background via-background/70 to-transparent" />
                              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-300 backdrop-blur-md ring-1 ring-emerald-500/20">
                                <Globe size={11} aria-hidden />
                                {tp('liveBadge')}
                              </span>
                              <a
                                href={project.vercelDomainUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-0 m-3 flex items-center justify-center rounded-xl opacity-0 transition duration-500 group-hover:opacity-100 sm:m-4"
                              >
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/20">
                                  <ExternalLink size={20} className="text-white" />
                                </div>
                              </a>
                            </>
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                                <Rocket size={24} className="text-zinc-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-zinc-300">{tp('notDeployedTitle')}</p>
                                <p className="mt-1 text-xs text-zinc-500">
                                  {tp('notDeployedDescription')}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-2">
                            <h2 className="line-clamp-1 text-base font-semibold text-white sm:text-lg">
                              {project.projectName || tp('untitledProject')}
                            </h2>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-zinc-500">
                            <span className="inline-flex items-center gap-1">
                              <span className="h-1 w-1 rounded-full bg-zinc-500" />
                              {formatRelativeTime(project.updatedAt, tp, locale)}
                            </span>
                            {isDeployed && project.vercelDomainUrl && (
                              <a
                                href={project.vercelDomainUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 truncate text-glow-cyan/70 transition hover:text-glow-cyan hover:underline"
                              >
                                <Globe size={10} aria-hidden />
                                <span className="max-w-[8rem] truncate">
                                  {new URL(project.vercelDomainUrl).hostname}
                                </span>
                              </a>
                            )}
                          </div>

                          <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => void openProjectInGeneration(project)}
                              disabled={Boolean(openingProjectId) || Boolean(deleteBusyId)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-glow-purple/40 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isOpening ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                  {tp('opening')}
                                </>
                              ) : (
                                <>
                                  <FolderOpen className="h-3.5 w-3.5" aria-hidden />
                                  {tp('open')}
                                </>
                              )}
                            </button>

                            {isDeployed && project.vercelDomainUrl && (
                              <a
                                href={project.vercelDomainUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-gradient-to-r from-primary/20 via-primary-soft/20 to-primary-accent/20 px-3 py-2 text-xs font-medium text-white transition hover:border-glow-cyan/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                              >
                                <Globe className="h-3.5 w-3.5" aria-hidden />
                                {tp('visit')}
                              </a>
                            )}
                            {project.pocketbaseAdminUrl && (
                              <a
                                href={project.pocketbaseAdminUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-gradient-to-r from-purple-500/20 via-purple-400/20 to-purple-300/20 px-3 py-2 text-xs font-medium text-white transition hover:border-purple-400/40 hover:shadow-[0_0_20px_rgba(192,132,252,0.2)]"
                              >
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                                {tp('admin')}
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => void deleteProject(project)}
                              disabled={Boolean(openingProjectId) || Boolean(deleteBusyId)}
                              className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              )}
                              {tp('delete')}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
          </>
        )}
        </section>

        <Footer />
      </main>
    </>
  );
}
