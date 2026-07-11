"use client";

import React, { memo } from "react";
import { Loader2, CheckCircle2, XCircle, ExternalLink, GripVertical } from "lucide-react";
import {
  DatabaseConnectionDialog,
  GithubPushDialog,
  ProjectNameDialog,
  DatabaseConnectionValue,
} from "@/components/builder/GenerationDialogs";
import { VercelDeployDialog } from "@/components/builder/VercelDeployDialog";
import { CloudProjectListItem } from "@/hooks/useCloudProjects";
import { AI_WEBSITE_API_KEY_SITE_URL } from "@/lib/ai/aiWebsiteApiKey";

const AI_WEBSITE_KEY_SITE = AI_WEBSITE_API_KEY_SITE_URL;

/* ── Draggable Vercel deploy status card ─────────────────────────────── */

type DeployCardProps = {
  card: NonNullable<DialogOverlaysWorkspace['vercelDeployCard']>;
  onClose: () => void;
};

function DraggableDeployCard({ card, onClose }: DeployCardProps) {
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartRef = React.useRef({ startX: 0, startY: 0, initialOffsetX: 0, initialOffsetY: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: offset.x,
      initialOffsetY: offset.y,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialOffsetX: offset.x,
      initialOffsetY: offset.y,
    };
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      setOffset({
        x: dragStartRef.current.initialOffsetX + dx,
        y: dragStartRef.current.initialOffsetY + dy,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.startX;
      const dy = touch.clientY - dragStartRef.current.startY;
      setOffset({
        x: dragStartRef.current.initialOffsetX + dx,
        y: dragStartRef.current.initialOffsetY + dy,
      });
    };

    const handleUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging]);

  const borderClass =
    card.status === 'success' && !card.isPolling
      ? 'border-emerald-400/45 bg-black text-emerald-100'
      : card.status === 'failed'
        ? 'border-red-400/45 bg-black text-red-100'
        : 'border-glow-cyan/45 bg-black text-zinc-100';

  return (
    <div
      className="fixed right-5 top-20 z-[226]"
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div
        className={`min-w-[300px] max-w-[400px] select-none rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur-md ${borderClass}`}
      >
        {/* Drag handle */}
        <div
          className="mb-2 flex cursor-grab items-center justify-center gap-1 rounded-md py-1 opacity-40 hover:bg-white/5 hover:opacity-70 active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          title="Drag to move"
        >
          <GripVertical className="h-3.5 w-3.5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Drag</span>
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 shrink-0">
            {card.isPolling || card.status === 'deploying' ? (
              <Loader2 className="h-4 w-4 animate-spin text-glow-cyan" aria-hidden />
            ) : card.status === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden />
            ) : (
              <XCircle className="h-4 w-4 text-red-300" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug">
              {card.siteTitle || card.projectName || 'Project'}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed opacity-90">
              {card.message}
            </p>
            {card.deploymentStatus && (
              <p className="mt-1 text-xs opacity-70">
                Status: <span className="font-mono">{card.deploymentStatus}</span>
              </p>
            )}
            {card.domainUrl && (
              <a
                href={card.domainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                onClick={(e) => e.stopPropagation()}
              >
                {card.domainUrl}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </div>
        </div>

        {/* Close button — always visible */}
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium opacity-90 transition hover:bg-white/10 hover:opacity-100"
            aria-label="Close Vercel deployment status"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export interface DialogOverlaysWorkspace {
  showApiKeyDialog: boolean;
  setShowApiKeyDialog: React.Dispatch<React.SetStateAction<boolean>>;
  apiKeyInput: string;
  setApiKeyInput: React.Dispatch<React.SetStateAction<string>>;
  apiKeyError: string | null;
  apiKeySaving: boolean;
  saveAiWebsiteApiKey: () => Promise<void>;
  showQuotaDialog: boolean;
  setShowQuotaDialog: React.Dispatch<React.SetStateAction<boolean>>;
  quotaErrorText: string | null;
  zipNotice: { status: "preparing" | "ready" | "error"; message: string } | null;
  databaseDialogOpen: boolean;
  setDatabaseDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  githubPushDialogOpen: boolean;
  setGithubPushDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  projectNameDialogOpen: boolean;
  setProjectNameDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  projectNameSuggestion: string | null;
  siteTitleSuggestion: string | null;
  projectNameConfirming: boolean;
  confirmProjectNameAndContinue: (name: string, siteTitle: string) => Promise<void>;
  cancelProjectNameAndPendingAction: () => void;
  renameProjectDialogOpen: boolean;
  setRenameProjectDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  renameProjectTarget: CloudProjectListItem | null;
  setRenameProjectTarget: React.Dispatch<
    React.SetStateAction<CloudProjectListItem | null>
  >;
  suggestProjectName: () => string;
  submitProjectRename: (name: string) => Promise<void>;
  saveDatabaseConnection: (v: DatabaseConnectionValue) => void;
  executeGithubPush: (repoName: string) => Promise<void>;
  executeVercelDeploy: (customDomain: string) => Promise<void>;
  defaultGithubRepoName: string;
  integrationBusy: 'github' | 'vercel' | null;
  vercelDeployDialogOpen: boolean;
  setVercelDeployDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  githubPushResult: { type: 'success' | 'error'; message: string } | null;
  setGithubPushResult: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error'; message: string } | null>>;
  vercelDeployResult: { type: 'success' | 'error'; message: string } | null;
  setVercelDeployResult: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error'; message: string } | null>>;
  vercelDeployCard: {
    status: "deploying" | "success" | "failed";
    message: string;
    domainUrl?: string;
    projectName?: string;
    siteTitle?: string;
    appUuid?: string;
    deploymentStatus?: string;
    commitMessage?: string;
    isPolling?: boolean;
  } | null;
  setVercelDeployCard: React.Dispatch<
    React.SetStateAction<{
      status: "deploying" | "success" | "failed";
      message: string;
      domainUrl?: string;
      projectName?: string;
      siteTitle?: string;
      appUuid?: string;
      deploymentStatus?: string;
      commitMessage?: string;
      isPolling?: boolean;
    } | null>
  >;
  currentSessionProjectId: string | null;
  currentProjectVercelInfo: {
    appUuid?: string | null;
    domainUrl?: string | null;
  } | null;
  conversationContext: {
    databaseConnection?: DatabaseConnectionValue | null;
    currentProject?: string;
    siteTitle?: string;
  };
}

function GenerationDialogOverlays({
  workspace,
}: {
  workspace: DialogOverlaysWorkspace;
}) {
  return (
    <>
      {workspace.showApiKeyDialog && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950/95 p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">
              GitHub API Key Required
            </h3>
            <p className="mt-2 text-sm text-zinc-300">
              To use GitHub API Provider models, add your API key first.
            </p>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                Your GitHub API Key
              </label>
              <input
                type="password"
                value={workspace.apiKeyInput}
                onChange={(e) => workspace.setApiKeyInput(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition focus:border-glow-cyan/60"
                placeholder="Paste your key here"
                autoFocus
              />
              {workspace.apiKeyError && (
                <p className="mt-2 text-xs text-red-300">
                  {workspace.apiKeyError}
                </p>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <a
                href={AI_WEBSITE_KEY_SITE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-glow-cyan/50 bg-glow-cyan/10 px-3 py-2 text-xs font-semibold text-glow-cyan transition hover:bg-glow-cyan/20"
              >
                Get API key
              </a>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => workspace.setShowApiKeyDialog(false)}
                  disabled={workspace.apiKeySaving}
                  className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-60"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => void workspace.saveAiWebsiteApiKey()}
                  disabled={
                    workspace.apiKeySaving || !workspace.apiKeyInput.trim()
                  }
                  className="rounded-lg bg-gradient-to-r from-primary via-primary-soft to-primary-accent px-3 py-2 text-xs font-semibold text-white shadow-soft-glow transition disabled:opacity-60"
                >
                  {workspace.apiKeySaving ? "Validating..." : "Save key"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {workspace.showQuotaDialog && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-red-400/35 bg-zinc-950/95 p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">
              Not enough API credits
            </h3>
            <p className="mt-2 text-sm text-zinc-300">
              Your GitHub API Provider account does not have enough credits to run
              this request.
            </p>
            {workspace.quotaErrorText ? (
              <p className="mt-3 rounded-lg border border-red-400/25 bg-red-950/35 px-3 py-2 text-xs text-red-200">
                {workspace.quotaErrorText}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <a
                href={AI_WEBSITE_KEY_SITE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-glow-cyan/50 bg-glow-cyan/10 px-3 py-2 text-xs font-semibold text-glow-cyan transition hover:bg-glow-cyan/20"
              >
                Recharge credits
              </a>
              <button
                type="button"
                onClick={() => workspace.setShowQuotaDialog(false)}
                className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {workspace.vercelDeployCard && (
        <DraggableDeployCard
          card={workspace.vercelDeployCard}
          onClose={() => workspace.setVercelDeployCard(null)}
        />
      )}

      {workspace.zipNotice && (
        <div className="pointer-events-none fixed right-5 top-[192px] z-[220]">
          <div
            className={`flex min-w-[260px] max-w-[320px] items-center gap-3 rounded-xl border px-3 py-2.5 text-sm shadow-xl backdrop-blur-md ${
              workspace.zipNotice.status === "error"
                ? "border-red-400/40 bg-red-950/85 text-red-100"
                : workspace.zipNotice.status === "ready"
                  ? "border-emerald-400/40 bg-emerald-950/85 text-emerald-100"
                  : "border-glow-cyan/35 bg-zinc-900/90 text-zinc-100"
            }`}
          >
            <div className="mt-0.5">
              {workspace.zipNotice.status === "preparing" ? (
                <span className="inline-block h-4 w-4 rounded-full border-2 border-glow-cyan/80 border-t-transparent animate-spin" />
              ) : workspace.zipNotice.status === "ready" ? (
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              ) : (
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-300 shadow-[0_0_10px_rgba(252,165,165,0.8)]" />
              )}
            </div>
            <p className="leading-snug">{workspace.zipNotice.message}</p>
          </div>
        </div>
      )}

      <DatabaseConnectionDialog
        open={workspace.databaseDialogOpen}
        onOpenChange={workspace.setDatabaseDialogOpen}
        value={workspace.conversationContext.databaseConnection ?? null}
        onSave={workspace.saveDatabaseConnection}
      />
      <GithubPushDialog
        open={workspace.githubPushDialogOpen}
        onOpenChange={workspace.setGithubPushDialogOpen}
        defaultRepoName={workspace.defaultGithubRepoName}
        onConfirmPush={workspace.executeGithubPush}
        pushing={workspace.integrationBusy === "github"}
        result={workspace.githubPushResult}
        onClearResult={() => workspace.setGithubPushResult(null)}
      />
      <VercelDeployDialog
        open={workspace.vercelDeployDialogOpen}
        onOpenChange={(open) => workspace.setVercelDeployDialogOpen(open)}
        projectName={workspace.conversationContext.currentProject || 'ai-website-app'}
        existingDomainUrl={workspace.currentProjectVercelInfo?.domainUrl}
        existingAppUuid={workspace.currentProjectVercelInfo?.appUuid}
        projectId={workspace.currentSessionProjectId}
        onConfirmDeploy={(domain) => workspace.executeVercelDeploy(domain)}
        deploying={workspace.integrationBusy === 'vercel'}
        result={workspace.vercelDeployResult}
        onClearResult={() => workspace.setVercelDeployResult(null)}
      />
      <ProjectNameDialog
        open={workspace.projectNameDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            workspace.cancelProjectNameAndPendingAction();
            return;
          }
          workspace.setProjectNameDialogOpen(true);
        }}
        title={workspace.currentSessionProjectId ? 'Update project name' : 'Name this project'}
        description={
          workspace.currentSessionProjectId
            ? 'Confirm the project name to update ai-website.json before saving.'
            : 'Confirm a project name before first save. This name is reused for Supabase, GitHub repo default, and Vercel project default.'
        }
        confirmButtonLabel={workspace.currentSessionProjectId ? 'Update & save' : 'Confirm name'}
        suggestedName={
          workspace.projectNameSuggestion || workspace.suggestProjectName()
        }
        suggestedSiteTitle={workspace.siteTitleSuggestion || workspace.projectNameSuggestion || workspace.suggestProjectName()}
        confirming={workspace.projectNameConfirming}
        onConfirm={(name, siteTitle) => void workspace.confirmProjectNameAndContinue(name, siteTitle)}
      />
      <ProjectNameDialog
        open={workspace.renameProjectDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            workspace.setRenameProjectDialogOpen(false);
            workspace.setRenameProjectTarget(null);
            return;
          }
          workspace.setRenameProjectDialogOpen(true);
        }}
        title="Rename project"
        description="Update the name in your project list. Saved snapshots keep using this name when you return."
        suggestedName={
          (workspace.renameProjectTarget?.projectName || "Untitled project").trim() ||
          "Untitled project"
        }
        confirmButtonLabel="Rename"
        confirmingButtonLabel="Renaming…"
        onConfirm={(name) => void workspace.submitProjectRename(name)}
      />
    </>
  );
}

export default memo(GenerationDialogOverlays);
