import { useState, useCallback, useRef } from 'react';
import { listProjects, deleteProject as apiDeleteProject } from '@/lib/api/client';

export interface CloudProjectListItem {
  projectId: string;
  projectName: string;
  updatedAt: number;
  vercelProjectId?: string | null;
  vercelDomainUrl?: string | null;
  vercelDeployedAt?: string | null;
  pocketbaseUrl?: string | null;
  pocketbaseAdminUrl?: string | null;
}

export function useCloudProjects() {
  const [cloudProjects, setCloudProjects] = useState<CloudProjectListItem[]>([]);
  const [cloudProjectsLoading, setCloudProjectsLoading] = useState(false);
  const [cloudProjectsError, setCloudProjectsError] = useState<string | null>(null);
  const [cloudProjectsFetched, setCloudProjectsFetched] = useState(false);
  const [projectOpeningBusy, setProjectOpeningBusy] = useState(false);
  const [projectDeleteBusyId, setProjectDeleteBusyId] = useState<string | null>(null);
  const [projectRenameBusyId, setProjectRenameBusyId] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  const loadCloudProjects = useCallback(async () => {
    if (cloudProjectsLoading) return;
    setCloudProjectsLoading(true);
    setCloudProjectsError(null);
    const seq = ++requestSeqRef.current;

    try {
      const result = await listProjects();
      if (!result.ok) {
        setCloudProjectsError(result.error || 'Failed to load projects');
        return;
      }
      const data = result.data;
      if (seq !== requestSeqRef.current) return; // Ignore stale responses
      if (data.success && Array.isArray(data.projects)) {
        setCloudProjects(data.projects);
        setCloudProjectsFetched(true);
      }
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      setCloudProjectsError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      if (seq === requestSeqRef.current) {
        setCloudProjectsLoading(false);
      }
    }
  }, [cloudProjectsLoading]);

  const deleteCloudProject = useCallback(
    async (project: CloudProjectListItem) => {
      const projectId = project.projectId;
      if (!projectId || projectOpeningBusy || projectDeleteBusyId || projectRenameBusyId) return;

      if (!window.confirm(`Delete project "${project.projectName || 'Untitled'}"? This cannot be undone.`)) {
        return;
      }

      setProjectDeleteBusyId(projectId);
      try {
        const result = await apiDeleteProject(projectId);
        if (result.ok) {
          setCloudProjects((prev) => prev.filter((p) => p.projectId !== projectId));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not delete project.';
        console.error('[useCloudProjects] Delete failed:', err);
        setCloudProjectsError(message);
      } finally {
        setProjectDeleteBusyId(null);
      }
    },
    [projectOpeningBusy, projectDeleteBusyId, projectRenameBusyId]
  );

  return {
    // State
    cloudProjects,
    cloudProjectsLoading,
    cloudProjectsError,
    cloudProjectsFetched,
    projectOpeningBusy,
    projectDeleteBusyId,
    projectRenameBusyId,
    // Setters
    setCloudProjects,
    setCloudProjectsLoading,
    setCloudProjectsError,
    setCloudProjectsFetched,
    setProjectOpeningBusy,
    setProjectDeleteBusyId,
    setProjectRenameBusyId,
    // Actions
    loadCloudProjects,
    deleteCloudProject,
  };
}
