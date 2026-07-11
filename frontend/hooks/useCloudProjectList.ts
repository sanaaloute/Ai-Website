import { useCallback } from 'react';
import { listProjects, deleteProject, renameProject } from '@/lib/api/client';
import { normalizeGithubRepoUrl } from '@/lib/github';
import type { ChatMessage, ConversationContext } from '@/hooks/useWorkspaceChat';
import type { CloudProjectListItem } from '@/lib/generation/types';

export interface CloudProjectListDeps {
  currentSessionProjectId: string | null;
  selectedCloudProjectId: string;
  activeProjectId: string | null;
  cloudProjects: CloudProjectListItem[];
  projectOpeningBusy: boolean;
  projectDeleteBusyId: string | null;
  projectRenameBusyId: string | null;
  setCloudProjectsLoading: (val: boolean) => void;
  setCloudProjectsError: (err: string | null) => void;
  setCloudProjects: React.Dispatch<React.SetStateAction<CloudProjectListItem[]>>;
  setCurrentSessionProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedCloudProjectId: React.Dispatch<React.SetStateAction<string>>;
  setActiveProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  setProjectDeleteBusyId: (id: string | null) => void;
  setProjectMenuOpen: (val: boolean) => void;
  setRenameProjectDialogOpen: (val: boolean) => void;
  setRenameProjectTarget: (project: CloudProjectListItem | null) => void;
  renameProjectTarget: CloudProjectListItem | null;
  setProjectRenameBusyId: (id: string | null) => void;
  setConversationContext: React.Dispatch<React.SetStateAction<ConversationContext>>;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
  cloudProjectsRequestSeqRef: React.MutableRefObject<number>;
  lastKnownCloudProjectsRef: React.MutableRefObject<CloudProjectListItem[]>;
  preserveCloudProjectsUntilRef: React.MutableRefObject<number>;
  lastSavedProjectIdRef: React.MutableRefObject<string | null>;
  pendingAutoOpenProjectIdRef: React.MutableRefObject<string | null>;
  setLastGithubRepoUrl: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useCloudProjectList(deps: CloudProjectListDeps) {
  const {
    currentSessionProjectId,
    selectedCloudProjectId,
    activeProjectId,
    cloudProjects,
    projectOpeningBusy,
    projectDeleteBusyId,
    projectRenameBusyId,
    setCloudProjectsLoading,
    setCloudProjectsError,
    setCloudProjects,
    setCurrentSessionProjectId,
    setSelectedCloudProjectId,
    setActiveProjectId,
    setProjectDeleteBusyId,
    setProjectMenuOpen,
    setRenameProjectDialogOpen,
    setRenameProjectTarget,
    renameProjectTarget,
    setProjectRenameBusyId,
    setConversationContext,
    addChatMessage,
    cloudProjectsRequestSeqRef,
    lastKnownCloudProjectsRef,
    preserveCloudProjectsUntilRef,
    lastSavedProjectIdRef,
    pendingAutoOpenProjectIdRef,
    setLastGithubRepoUrl,
  } = deps;

  const loadCloudProjects = useCallback(
    async (opts?: { preserveOnTransientEmpty?: boolean; prioritizeProjectId?: string }) => {
      const preserveOnTransientEmpty = opts?.preserveOnTransientEmpty !== false;
      const requestSeq = ++cloudProjectsRequestSeqRef.current;
      setCloudProjectsLoading(true);
      setCloudProjectsError(null);
      try {
        const result = await listProjects();
        if (!result.ok) {
          throw new Error(result.error || 'Failed to load projects.');
        }
        if (!result.data.success) {
          throw new Error(result.data.error || 'Failed to load projects.');
        }
        const json = result.data;
        if (requestSeq !== cloudProjectsRequestSeqRef.current) {
          return;
        }
        const projects = Array.isArray(json.projects) ? json.projects : [];
        const currentId = opts?.prioritizeProjectId || currentSessionProjectId;
        const sortedProjects = currentId
          ? [...projects].sort((a, b) => {
              if (a.projectId === currentId && b.projectId !== currentId) return -1;
              if (b.projectId === currentId && a.projectId !== currentId) return 1;
              return (b.updatedAt || 0) - (a.updatedAt || 0);
            })
          : projects;

        const shouldPreservePrevious =
          preserveOnTransientEmpty &&
          sortedProjects.length === 0 &&
          lastKnownCloudProjectsRef.current.length > 0 &&
          Date.now() < preserveCloudProjectsUntilRef.current;

        if (shouldPreservePrevious) {
          setCloudProjects(lastKnownCloudProjectsRef.current);
        } else {
          setCloudProjects(sortedProjects);
          if (sortedProjects.length > 0) {
            lastKnownCloudProjectsRef.current = sortedProjects;
          }
        }

        if (currentId) {
          const stillExists = sortedProjects.some((project) => project.projectId === currentId);
          const shouldDeferSelectionClear =
            preserveOnTransientEmpty &&
            Date.now() < preserveCloudProjectsUntilRef.current &&
            (currentId === lastSavedProjectIdRef.current ||
              currentId === pendingAutoOpenProjectIdRef.current);
          if (!stillExists && !shouldPreservePrevious && !shouldDeferSelectionClear) {
            setCurrentSessionProjectId(null);
            setSelectedCloudProjectId('');
            setLastGithubRepoUrl(null);
          } else if (!selectedCloudProjectId) {
            setSelectedCloudProjectId(currentId);
          }
          const projectList = shouldPreservePrevious ? lastKnownCloudProjectsRef.current : sortedProjects;
          const currentProject = projectList.find((project) => project.projectId === currentId);
          setLastGithubRepoUrl(normalizeGithubRepoUrl(currentProject?.githubRepoUrl) || null);
        }

      } catch (error) {
        setCloudProjectsError(error instanceof Error ? error.message : 'Failed to load projects.');
      } finally {
        if (requestSeq === cloudProjectsRequestSeqRef.current) {
          setCloudProjectsLoading(false);
        }
      }
    },
    [
      currentSessionProjectId,
      selectedCloudProjectId,
      cloudProjectsRequestSeqRef,
      setCloudProjectsLoading,
      setCloudProjectsError,
      setCloudProjects,
      setCurrentSessionProjectId,
      setSelectedCloudProjectId,
      lastKnownCloudProjectsRef,
      preserveCloudProjectsUntilRef,
      lastSavedProjectIdRef,
      pendingAutoOpenProjectIdRef,
      setLastGithubRepoUrl,
    ]
  );

  const deleteCloudProject = useCallback(
    async (project: CloudProjectListItem) => {
      const projectId = project.projectId;
      if (!projectId || projectOpeningBusy || projectDeleteBusyId || projectRenameBusyId) return;

      const readableName = (project.projectName || 'Untitled project').trim() || 'Untitled project';
      const shouldDelete = window.confirm(`Delete "${readableName}"? This action cannot be undone.`);
      if (!shouldDelete) return;

      setProjectDeleteBusyId(projectId);
      try {
        const result = await deleteProject(projectId);
        if (!result.ok) {
          throw new Error(result.error || 'Could not delete project.');
        }
        if (!result.data.success) {
          throw new Error(result.data.error || 'Could not delete project.');
        }

        setCloudProjects((prev) => prev.filter((item) => item.projectId !== projectId));
        setSelectedCloudProjectId((prev) => (prev === projectId ? '' : prev));
        setCurrentSessionProjectId((prev) => (prev === projectId ? null : prev));
        setActiveProjectId((prev) => (prev === projectId ? null : prev));

        addChatMessage(`Deleted project "${readableName}".`, 'system');

        const remainingProjects = cloudProjects.filter((item) => item.projectId !== projectId);
        if (remainingProjects.length === 0) {
          setProjectMenuOpen(false);
        } else {
          void loadCloudProjects({ preserveOnTransientEmpty: false });
        }
      } catch (error) {
        addChatMessage(
          error instanceof Error ? error.message : 'Could not delete project.',
          'error'
        );
      } finally {
        setProjectDeleteBusyId(null);
      }
    },
    [
      cloudProjects,
      loadCloudProjects,
      projectDeleteBusyId,
      projectOpeningBusy,
      projectRenameBusyId,
      setProjectDeleteBusyId,
      setCloudProjects,
      setSelectedCloudProjectId,
      setCurrentSessionProjectId,
      setActiveProjectId,
      addChatMessage,
      setProjectMenuOpen,
    ]
  );

  const openRenameProjectDialog = useCallback(
    (project: CloudProjectListItem) => {
      const projectId = project.projectId;
      if (!projectId || projectOpeningBusy || projectDeleteBusyId || projectRenameBusyId) return;
      setRenameProjectTarget(project);
      setRenameProjectDialogOpen(true);
      setProjectMenuOpen(false);
    },
    [
      projectDeleteBusyId,
      projectOpeningBusy,
      projectRenameBusyId,
      setRenameProjectTarget,
      setRenameProjectDialogOpen,
      setProjectMenuOpen,
    ]
  );

  const submitProjectRename = useCallback(
    async (name: string) => {
      const project = renameProjectTarget;
      if (!project?.projectId) {
        setRenameProjectDialogOpen(false);
        setRenameProjectTarget(null);
        return;
      }
      const projectId = project.projectId;
      const currentName = (project.projectName || '').trim() || 'Untitled project';
      const nextName = name.trim();
      if (nextName.length < 2) {
        addChatMessage('Project name must be at least 2 characters.', 'system');
        return;
      }
      if (nextName === currentName) {
        setRenameProjectDialogOpen(false);
        setRenameProjectTarget(null);
        return;
      }

      setProjectRenameBusyId(projectId);
      setRenameProjectDialogOpen(false);
      setRenameProjectTarget(null);
      try {
        const result = await renameProject(projectId, nextName);
        if (!result.ok) {
          throw new Error(result.error || 'Could not rename project.');
        }
        if (!result.data.success) {
          throw new Error(result.data.error || 'Could not rename project.');
        }

        const persistedName = String(result.data.projectName || nextName).trim() || nextName;
        setCloudProjects((prev) =>
          prev.map((item) =>
            item.projectId === projectId
              ? { ...item, projectName: persistedName, updatedAt: Date.now() }
              : item
          )
        );

        if (
          currentSessionProjectId === projectId ||
          activeProjectId === projectId ||
          selectedCloudProjectId === projectId
        ) {
          setConversationContext((prev) => ({ ...prev, currentProject: persistedName }));
        }

        addChatMessage(`Renamed project to "${persistedName}".`, 'system');
      } catch (error) {
        addChatMessage(
          error instanceof Error ? error.message : 'Could not rename project.',
          'error'
        );
      } finally {
        setProjectRenameBusyId(null);
      }
    },
    [
      activeProjectId,
      currentSessionProjectId,
      selectedCloudProjectId,
      renameProjectTarget,
      setRenameProjectDialogOpen,
      setRenameProjectTarget,
      addChatMessage,
      setProjectRenameBusyId,
      setCloudProjects,
      setConversationContext,
    ]
  );

  return {
    loadCloudProjects,
    deleteCloudProject,
    openRenameProjectDialog,
    submitProjectRename,
  };
}
