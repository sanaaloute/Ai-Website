import { useCallback, useRef } from 'react';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import type { ChatMessage, ConversationContext } from '@/hooks/useWorkspaceChat';
import type { CloudProjectListItem } from '@/lib/generation/types';
import type { StoredChatMessageV1 } from '@/lib/generation/storedChatTypes';
import { saveSnapshot, saveProject } from '@/lib/api/client';
import { isUuidProjectId } from '@/lib/generation/remoteSandboxSnapshot';
import { assertCurrentSandboxIdStrict } from '@/lib/sandbox/sandboxClientSession';

export interface CloudPersistenceDeps {
  latestSnapshotRef: React.MutableRefObject<{
    sandboxId: string | null;
    projectId: string | null;
    projectName: string;
    fileStructure: string;
    structureContent: string;
    sandboxFiles: Record<string, string>;
    chat: StoredChatMessageV1[];
  }>;
  sandboxData: SandboxData | null;
  isSavingProject: boolean;
  activeProjectId: string | null;
  conversationContextCurrentProject: string;
  conversationContextSiteTitle: string;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
  setIsSavingProject: (val: boolean) => void;
  setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentSessionProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedCloudProjectId: React.Dispatch<React.SetStateAction<string>>;
  setCloudProjects: React.Dispatch<React.SetStateAction<CloudProjectListItem[]>>;
  setConversationContext: React.Dispatch<React.SetStateAction<ConversationContext>>;
  preserveCloudProjectsUntilRef: React.MutableRefObject<number>;
  loadCloudProjects: (opts?: { preserveOnTransientEmpty?: boolean; prioritizeProjectId?: string }) => Promise<void>;
  LAST_SAVED_PROJECT_KEY: string;
  lastSavedProjectIdRef: React.MutableRefObject<string | null>;
  hasMeaningfulSnapshot: (
    snapshot: {
      fileStructure: string;
      structureContent: string;
      sandboxFiles: Record<string, string>;
      chat: StoredChatMessageV1[];
    }
  ) => boolean;
}

export function chatMessagesToStoredRows(messages: ChatMessage[]): StoredChatMessageV1[] {
  return messages
    .filter((m) => m.type === 'user' || m.type === 'ai')
    .map((m) => ({
      content: m.content,
      type: m.type,
      timestamp: m.timestamp.getTime(),
      metadata: m.metadata as Record<string, unknown> | undefined,
    }));
}

export function mapSandboxFilesToGenerationFiles(
  files: Record<string, string>
): Array<{ path: string; content: string; type: string; completed: boolean; edited: boolean }> {
  return Object.entries(files).map(([path, content]) => {
    const ext = path.split('.').pop() || '';
    const type =
      ext === 'jsx' || ext === 'tsx'
        ? 'tsx'
        : ext === 'js' || ext === 'ts'
          ? 'typescript'
          : ext === 'css'
            ? 'css'
            : ext === 'json'
              ? 'json'
              : ext === 'html'
                ? 'html'
                : 'javascript';

    return {
      path,
      content: String(content),
      type,
      completed: true,
      edited: false,
    };
  });
}

export function useCloudPersistence(deps: CloudPersistenceDeps) {
  const {
    latestSnapshotRef,
    sandboxData,
    isSavingProject,
    activeProjectId,
    conversationContextCurrentProject,
    conversationContextSiteTitle,
    addChatMessage,
    setIsSavingProject,
    setActiveProjectId,
    setCurrentSessionProjectId,
    setSelectedCloudProjectId,
    setCloudProjects,
    setConversationContext,
    preserveCloudProjectsUntilRef,
    loadCloudProjects,
    LAST_SAVED_PROJECT_KEY,
    lastSavedProjectIdRef,
    hasMeaningfulSnapshot,
  } = deps;

  const cloudSaveInFlightRef = useRef(false);
  const lastCloudSnapshotHashRef = useRef('');

  const rememberLastSavedProjectId = useCallback(
    (projectId: string | null) => {
      const normalized = (projectId || '').trim() || null;
      lastSavedProjectIdRef.current = normalized;
      if (typeof window === 'undefined') return;
      try {
        if (normalized) {
          window.sessionStorage.setItem(LAST_SAVED_PROJECT_KEY, normalized);
        } else {
          window.sessionStorage.removeItem(LAST_SAVED_PROJECT_KEY);
        }
      } catch (e) {
        console.warn('[cloudPersistence] Failed to persist lastSavedProjectId to sessionStorage:', e);
      }
    },
    [LAST_SAVED_PROJECT_KEY, lastSavedProjectIdRef]
  );

  const persistSnapshotToCloud = useCallback(
    async (sandboxIdOverride?: string): Promise<boolean> => {
      if (typeof window === 'undefined') return false;
      const current = latestSnapshotRef.current;
      const sandboxId = sandboxIdOverride || current.sandboxId;
      if (!sandboxId) return false;
      if (sandboxId && !assertCurrentSandboxIdStrict(sandboxId, 'persistSnapshotToCloud')) {
        console.warn('[persistSnapshotToCloud] Aborting: sandbox ID is stale');
        return false;
      }
      if (!isUuidProjectId(current.projectId)) return false;
      if (!hasMeaningfulSnapshot(current)) return false;
      if (cloudSaveInFlightRef.current) return false;

      const payload = {
        sandboxId,
        projectId: current.projectId as string,
        projectName: current.projectName,
        fileStructure: current.fileStructure,
        structureContent: current.structureContent,
        sandboxFiles: current.sandboxFiles,
        chat: current.chat as Array<Record<string, unknown>>,
        updatedAt: new Date().toISOString(),
      };
      const hash = JSON.stringify(payload);
      if (hash === lastCloudSnapshotHashRef.current) return true;

      try {
        cloudSaveInFlightRef.current = true;
        const result = await saveSnapshot(payload);
        if (!result.ok) {
          if (result.status !== 401) {
            console.warn('[generation] cloud snapshot save failed:', result.status);
            addChatMessage(`Cloud snapshot save failed (status ${result.status}). Your progress is still safe in the sandbox.`, 'system');
          }
          return false;
        }
        lastCloudSnapshotHashRef.current = hash;
        return true;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Network error';
        console.warn('[generation] cloud snapshot save failed:', error);
        addChatMessage(`Cloud snapshot save failed: ${msg}. Your progress is still safe in the sandbox.`, 'system');
        return false;
      } finally {
        cloudSaveInFlightRef.current = false;
      }
    },
    [latestSnapshotRef, hasMeaningfulSnapshot, setActiveProjectId, cloudSaveInFlightRef, lastCloudSnapshotHashRef]
  );

  const persistProjectDurably = useCallback(
    async (
      saveReason: 'manual' | 'auto-generation-success' = 'manual',
      projectNameOverride?: string
    ): Promise<boolean> => {
      const sandboxId = sandboxData?.sandboxId;
      if (!sandboxId) return false;
      if (sandboxId && !assertCurrentSandboxIdStrict(sandboxId, 'persistProjectDurably')) {
        console.warn('[persistProjectDurably] Aborting: sandbox ID is stale');
        return false;
      }
      if (isSavingProject) return false;
      let resolvedProjectName = (projectNameOverride ?? conversationContextCurrentProject ?? '').trim();

      // If no name is set but we have an active project, read the canonical name
      // from ai-website.json so re-saves keep the existing name.
      if (!resolvedProjectName && activeProjectId) {
        try {
          const aiWebsiteRaw = latestSnapshotRef.current.sandboxFiles?.['ai-website.json'];
          if (aiWebsiteRaw) {
            const aiWebsite = JSON.parse(aiWebsiteRaw) as { project?: { name?: string } };
            resolvedProjectName = (aiWebsite.project?.name || '').trim();
          }
        } catch {
          // ignore malformed ai-website.json
        }
      }

      // Never send the project ID itself as the display name.
      if (resolvedProjectName && activeProjectId && resolvedProjectName === activeProjectId) {
        resolvedProjectName = '';
      }

      if (!resolvedProjectName) {
        addChatMessage('Project save skipped: a project name is required.', 'system');
        return false;
      }

      const current = latestSnapshotRef.current;
      const hasFiles = Object.keys(current.sandboxFiles || {}).length > 0;
      if (!hasFiles) {
        addChatMessage('Project save skipped: no generated files yet.', 'system');
        return false;
      }

      setIsSavingProject(true);
      try {
        const result = await saveProject({
          sandboxId,
          projectId: activeProjectId || undefined,
          projectName: resolvedProjectName,
          siteTitle: conversationContextSiteTitle || resolvedProjectName,
          fileStructure: current.fileStructure,
          structureContent: current.structureContent,
          sandboxFiles: current.sandboxFiles || {},
          chat: current.chat as Array<Record<string, unknown>>,
          saveReason,
        });
        const json = (result.ok ? result.data : {}) as {
          success?: boolean;
          error?: string;
          projectId?: string;
          projectName?: string;
          savedFiles?: number;
          dbSynced?: boolean;
          warnings?: string[];
        };
        if (!result.ok || !json.success) {
          throw new Error(json.error || 'Failed to save project.');
        }
        if (typeof json.projectId === 'string' && json.projectId) {
          const projectId = json.projectId;
          const persistedName = String(json.projectName || resolvedProjectName || '').trim();
          rememberLastSavedProjectId(projectId);
          if (persistedName) {
            setConversationContext((prev) => ({ ...prev, currentProject: persistedName }));
          }
          setActiveProjectId(projectId);
          setCurrentSessionProjectId(projectId);
          setSelectedCloudProjectId(projectId);
          setCloudProjects((prev) => {
            const projectName = persistedName || `Project ${projectId.slice(0, 8)}`;
            const nextEntry: CloudProjectListItem = {
              projectId,
              projectName,
              updatedAt: Date.now(),
            };
            const withoutCurrent = prev.filter((project) => project.projectId !== projectId);
            return [nextEntry, ...withoutCurrent];
          });
        }
        addChatMessage(
          `Project saved to Supabase (${json.savedFiles || 0} files).`,
          'system'
        );
        if (json.dbSynced === false && Array.isArray(json.warnings) && json.warnings.length > 0) {
          addChatMessage(
            `Save completed with warnings: ${json.warnings.slice(0, 2).join(' | ')}`,
            'system'
          );
        }
        preserveCloudProjectsUntilRef.current = Date.now() + 12_000;
        void loadCloudProjects({
          preserveOnTransientEmpty: true,
          prioritizeProjectId: typeof json.projectId === 'string' ? json.projectId : undefined,
        });
        return true;
      } catch (error) {
        const cleanError = error instanceof Error ? error.message : 'Failed to save project.';
        addChatMessage(cleanError, 'system');
        return false;
      } finally {
        setIsSavingProject(false);
      }
    },
    [
      activeProjectId,
      conversationContextCurrentProject,
      conversationContextSiteTitle,
      isSavingProject,
      sandboxData?.sandboxId,
      latestSnapshotRef,
      addChatMessage,
      setIsSavingProject,
      setActiveProjectId,
      setCurrentSessionProjectId,
      setSelectedCloudProjectId,
      setCloudProjects,
      setConversationContext,
      rememberLastSavedProjectId,
      preserveCloudProjectsUntilRef,
      loadCloudProjects,
    ]
  );

  return {
    rememberLastSavedProjectId,
    persistSnapshotToCloud,
    persistProjectDurably,
    chatMessagesToStoredRows,
    mapSandboxFilesToGenerationFiles,
  };
}
