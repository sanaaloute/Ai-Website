'use client';

import { memo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import BuilderHeader from '@/components/builder/BuilderHeader';
import { Pencil, Trash2, Save, GitBranch, Cloud, Database, Lock } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import type { CloudProjectListItem } from '@/hooks/useCloudProjects';
import { useSandboxPocketbaseInfo } from '@/hooks/useSandboxPocketbaseInfo';
import { useEntitlementsStore } from '@/stores/entitlementsStore';
import type { PlanFeatureId } from '@/lib/api/client';

export interface HeaderWorkspace {
  sandboxData: { sandboxId: string; url: string; [key: string]: unknown } | null;
  router: ReturnType<typeof useRouter>;
  searchParams: ReadonlyURLSearchParams;
  projectOpeningBusy: boolean;
  loadCloudProjects: () => Promise<void>;
  projectMenuOpen: boolean;
  setProjectMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  cloudProjectsLoading: boolean;
  cloudProjectsError: string | null;
  cloudProjects: CloudProjectListItem[];
  cloudProjectsFetched: boolean;
  selectedCloudProjectId: string;
  setSelectedCloudProjectId: React.Dispatch<React.SetStateAction<string>>;
  currentSessionProjectId: string | null;
  projectRenameBusyId: string | null;
  projectDeleteBusyId: string | null;
  openCloudProject: (projectId: string) => Promise<void>;
  openRenameProjectDialog: (project: CloudProjectListItem) => void;
  deleteCloudProject: (project: CloudProjectListItem) => Promise<void>;
  ensureProjectNameForAction: (
    action:
      | { kind: 'save'; saveReason: 'manual' | 'auto-generation-success' }
      | { kind: 'github-open' }
      | { kind: 'vercel-deploy' }
  ) => boolean;
  persistProjectDurably: (
    saveReason?: 'manual' | 'auto-generation-success',
    projectNameOverride?: string
  ) => Promise<boolean>;
  isSavingProject: boolean;
  downloadZip: () => Promise<void>;
  isDownloadingZip: boolean;
  openGithubPushDialog: () => void;
  integrationReadiness: {
    ready: boolean;
    reasons: string[];
    primaryReason: string | null;
  };
  integrationBusy: 'github' | 'vercel' | null;
  hostOnVercel: () => Promise<void>;
}

export interface GenerationHeaderProps {
  workspace: HeaderWorkspace;
}

function GenerationHeaderComponent({ workspace }: GenerationHeaderProps) {
  const t = useTranslations('generation');
  const {
    sandboxData,
    projectOpeningBusy,
    loadCloudProjects,
    projectMenuOpen,
    setProjectMenuOpen,
    cloudProjectsLoading,
    cloudProjectsError,
    cloudProjects,
    cloudProjectsFetched,
    selectedCloudProjectId,
    setSelectedCloudProjectId,
    currentSessionProjectId,
    projectRenameBusyId,
    projectDeleteBusyId,
    openCloudProject,
    openRenameProjectDialog,
    deleteCloudProject,
    ensureProjectNameForAction,
    persistProjectDurably,
    isSavingProject,
    downloadZip,
    isDownloadingZip,
    openGithubPushDialog,
    integrationReadiness,
    integrationBusy,
    hostOnVercel,
  } = workspace;

  const { info: pocketbaseInfo, loading: pocketbaseLoading } = useSandboxPocketbaseInfo(
    sandboxData?.sandboxId
  );

  const entitlements = useEntitlementsStore((s) => s.entitlements);
  const loadEntitlements = useEntitlementsStore((s) => s.loadEntitlements);
  const hasFeature = useEntitlementsStore((s) => s.hasFeature);
  const openUpgradeDialog = useEntitlementsStore((s) => s.openUpgradeDialog);

  useEffect(() => {
    if (!entitlements) void loadEntitlements();
  }, [entitlements, loadEntitlements]);

  const promptUpgrade = (
    feature: PlanFeatureId,
    requiredPlan: 'basic' | 'standard' | 'pro',
    message: string
  ) => {
    openUpgradeDialog({ feature, quota: null, requiredPlan, message });
  };

  const pushLocked = !hasFeature('github_push');
  const deployLocked = !hasFeature('deploy');
  const pbAdminUrl = pocketbaseInfo?.adminUrl;
  const pbAdminEmail = pocketbaseInfo?.adminEmail ?? 'admin@ai-website.com';
  const pbAdminPassword = pocketbaseInfo?.adminPassword ?? 'admin';

  return (
    <header className="relative z-[120] flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-black/40 px-3 py-2 backdrop-blur-xl sm:px-4">
      <BuilderHeader />
      <div
        id="projects"
        className="flex flex-wrap items-center justify-end gap-1.5 scroll-mt-24"
      >
        <div className="relative z-[130]">
          <button
            type="button"
            onClick={() => {
              if (projectOpeningBusy) return;
              if (!projectMenuOpen && !cloudProjectsFetched) void loadCloudProjects();
              setProjectMenuOpen((v) => !v);
            }}
            disabled={projectOpeningBusy}
            className="max-w-[min(100%,14rem)] cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-left text-xs font-medium text-zinc-300 outline-none transition hover:border-glow-purple/30 focus:border-glow-purple/50 disabled:cursor-not-allowed disabled:opacity-60"
            title={t('header.openSavedProject')}
          >
            {(() => {
              if (projectOpeningBusy) return t('header.opening');
              if (cloudProjectsLoading) return t('header.loading');
              if (cloudProjectsError) return t('header.unavailable');
              if (cloudProjects.length === 0) return t('header.noProjects');
              const currentProject = cloudProjects.find(
                (p) => p.projectId === currentSessionProjectId
              );
              if (currentProject) {
                return (currentProject.projectName || t('header.untitled')).slice(0, 24);
              }
              return t('header.openWithCount', { count: cloudProjects.length });
            })()}
          </button>
          {projectMenuOpen && cloudProjects.length > 0 && !projectOpeningBusy && (
            <div className="absolute right-0 z-[140] mt-1.5 max-h-72 w-72 overflow-y-auto rounded-xl border border-white/[0.08] bg-black/95 p-1 shadow-2xl backdrop-blur-md">
              {cloudProjects.map((project) => {
                const label = (project.projectName || t('header.untitledProject')).slice(0, 40);
                const isSelected = selectedCloudProjectId === project.projectId;
                const isCurrent = currentSessionProjectId === project.projectId;
                const renameBusy = projectRenameBusyId === project.projectId;
                const deleteBusy = projectDeleteBusyId === project.projectId;
                return (
                  <div key={project.projectId} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProjectMenuOpen(false);
                        setSelectedCloudProjectId(project.projectId);
                        void openCloudProject(project.projectId);
                      }}
                      className={`block min-w-0 flex-1 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                        isSelected
                          ? 'bg-glow-purple/15 text-white'
                          : isCurrent
                            ? 'bg-glow-cyan/10 text-white hover:bg-glow-cyan/20'
                            : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <span className="truncate">{label}</span>
                      {isCurrent ? (
                        <span className="ml-1.5 rounded border border-glow-cyan/40 bg-glow-cyan/10 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-glow-cyan">
                          {t('header.current')}
                        </span>
                      ) : null}
                      {project.updatedAt ? (
                        <span className="ml-1.5 text-[10px] text-zinc-600">
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void openRenameProjectDialog(project);
                      }}
                      disabled={renameBusy || deleteBusy || projectOpeningBusy}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.06] text-zinc-500 transition hover:border-glow-cyan/30 hover:bg-glow-cyan/10 hover:text-glow-cyan disabled:cursor-not-allowed disabled:opacity-50"
                      title={renameBusy ? t('header.renaming') : t('header.rename')}
                      aria-label={t('header.renameProject', { name: project.projectName || t('header.untitledProject') })}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void deleteCloudProject(project);
                      }}
                      disabled={renameBusy || deleteBusy || projectOpeningBusy}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.06] text-zinc-500 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                      title={deleteBusy ? t('header.deleting') : t('header.delete')}
                      aria-label={t('header.deleteProject', { name: project.projectName || t('header.untitledProject') })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (ensureProjectNameForAction({ kind: 'save', saveReason: 'manual' })) {
              void persistProjectDurably('manual');
            }
          }}
          disabled={!sandboxData || isSavingProject}
          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs font-medium text-zinc-400 transition hover:border-glow-purple/30 hover:bg-white/[0.06] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-35"
          title={isSavingProject ? t('header.saving') : t('header.saveProject')}
        >
          <Save className="h-3.5 w-3.5 shrink-0 text-glow-purple/80" aria-hidden />
          <span className="hidden sm:inline">{isSavingProject ? t('header.saving') : t('header.save')}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            void downloadZip();
          }}
          disabled={!sandboxData || isDownloadingZip}
          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs font-medium text-zinc-400 transition hover:border-glow-cyan/30 hover:bg-white/[0.06] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-35"
          title={isDownloadingZip ? t('header.preparing') : t('header.downloadZip')}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          <span className="hidden sm:inline">{isDownloadingZip ? t('header.dlShort') : t('header.download')}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (pushLocked) {
              promptUpgrade(
                'github_push',
                'basic',
                t('header.pushUpgradeMessage')
              );
              return;
            }
            openGithubPushDialog();
          }}
          disabled={!pushLocked && (!integrationReadiness.ready || integrationBusy !== null)}
          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs font-medium text-zinc-400 transition hover:border-glow-purple/30 hover:bg-white/[0.06] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          title={
            pushLocked
              ? t('header.pushLockedTitle')
              : !integrationReadiness.ready
                ? integrationReadiness.primaryReason || t('header.workflowNotReady')
                : undefined
          }
        >
          {pushLocked ? (
            <Lock className="h-3.5 w-3.5 shrink-0 text-amber-300/80" aria-hidden />
          ) : (
            <GitBranch className="h-3.5 w-3.5 shrink-0 text-glow-purple/80" aria-hidden />
          )}
          <span className="hidden sm:inline">{integrationBusy === 'github' ? t('header.pushing') : t('header.push')}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (deployLocked) {
              promptUpgrade(
                'deploy',
                'basic',
                t('header.deployUpgradeMessage')
              );
              return;
            }
            void hostOnVercel();
          }}
          disabled={!deployLocked && integrationBusy !== null}
          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs font-medium text-zinc-400 transition hover:border-glow-cyan/30 hover:bg-white/[0.06] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          title={deployLocked ? t('header.deployLockedTitle') : undefined}
        >
          {deployLocked ? (
            <Lock className="h-3.5 w-3.5 shrink-0 text-amber-300/80" aria-hidden />
          ) : (
            <Cloud className="h-3.5 w-3.5 shrink-0 text-glow-cyan/80" aria-hidden />
          )}
          <span className="hidden sm:inline">{integrationBusy === 'vercel' ? t('header.deploying') : t('header.deploy')}</span>
        </button>
        {sandboxData && (
          <a
            href={pbAdminUrl || '#'}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              if (!pbAdminUrl) {
                e.preventDefault();
              }
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs font-medium text-zinc-400 transition hover:border-glow-cyan/30 hover:bg-white/[0.06] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            title={pbAdminUrl ? t('header.pocketbaseAdminTitle', { email: pbAdminEmail, password: pbAdminPassword }) : t('header.pocketbaseNotRunning')}
            aria-disabled={!pbAdminUrl || pocketbaseLoading}
            style={{ pointerEvents: !pbAdminUrl || pocketbaseLoading ? 'none' : 'auto', opacity: !pbAdminUrl || pocketbaseLoading ? 0.4 : 1 }}
          >
            <Database className="h-3.5 w-3.5 shrink-0 text-glow-cyan/80" aria-hidden />
            <span className="hidden sm:inline">PocketBase</span>
          </a>
        )}
      </div>
    </header>
  );
}

export const GenerationHeader = memo(GenerationHeaderComponent);
