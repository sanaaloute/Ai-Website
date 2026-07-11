import { useCallback, useMemo } from 'react';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import type { ChatMessage } from '@/hooks/useWorkspaceChat';
import type { GenerationProgress, CodeApplicationState } from '@/hooks/useGenerationProgress';
import type { CloudProjectListItem } from '@/lib/generation/types';
import type { StoredChatMessageV1 } from '@/lib/generation/storedChatTypes';
import { REMOTE_SNAPSHOT_EMPTY_STRUCTURE } from '@/lib/generation/remoteSandboxSnapshot';
import { chatMessagesToStoredRows } from './useCloudPersistence';

export interface ProjectNameDeps {
  searchParams: URLSearchParams;
  lastSavedProjectIdRef: React.MutableRefObject<string | null>;
  activeProjectId: string | null;
  currentSessionProjectId: string | null;
  selectedCloudProjectId: string;
  cloudProjects: CloudProjectListItem[];
  pendingAutoOpenProjectIdRef: React.MutableRefObject<string | null>;
  autoRestorePreferredProjectRef: React.MutableRefObject<boolean>;
  conversationContextCurrentProject: string;
  sandboxFiles: Record<string, string>;
  sandboxData: SandboxData | null;
  projectOpeningBusy: boolean;
  loading: boolean;
  generationProgressIsGenerating: boolean;
  codeApplicationStateStage: CodeApplicationState['stage'];
  fileStructure: string;
  structureContent: string;
  chatMessages: ChatMessage[];
}

export function useProjectName(deps: ProjectNameDeps) {
  const {
    searchParams,
    lastSavedProjectIdRef,
    activeProjectId,
    currentSessionProjectId,
    selectedCloudProjectId,
    cloudProjects,
    pendingAutoOpenProjectIdRef,
    autoRestorePreferredProjectRef,
    conversationContextCurrentProject,
    sandboxFiles,
    sandboxData,
    projectOpeningBusy,
    loading,
    generationProgressIsGenerating,
    codeApplicationStateStage,
    fileStructure,
    structureContent,
    chatMessages,
  } = deps;

  const resolvePreferredProjectId = useCallback((): string | null => {
    const urlProjectId = (searchParams.get('projectId') || '').trim();
    const candidates = [
      urlProjectId,
      lastSavedProjectIdRef.current,
      activeProjectId,
      currentSessionProjectId,
      selectedCloudProjectId,
    ];
    for (const candidate of candidates) {
      const normalized = (candidate || '').trim();
      if (normalized) return normalized;
    }
    if (cloudProjects.length === 0) return null;
    const latest = [...cloudProjects].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    return latest?.projectId || null;
  }, [
    searchParams,
    lastSavedProjectIdRef,
    activeProjectId,
    currentSessionProjectId,
    selectedCloudProjectId,
    cloudProjects,
  ]);

  const queueAutoOpenPreferredProject = useCallback(
    (preferredProjectId?: string | null): string | null => {
      const resolved = (preferredProjectId || '').trim() || resolvePreferredProjectId();
      if (!resolved) return null;
      pendingAutoOpenProjectIdRef.current = resolved;
      return resolved;
    },
    [resolvePreferredProjectId, pendingAutoOpenProjectIdRef]
  );

  const requestAutoRestorePreferredProject = useCallback(
    (preferredProjectId?: string | null): string | null => {
      autoRestorePreferredProjectRef.current = true;
      return queueAutoOpenPreferredProject(preferredProjectId);
    },
    [queueAutoOpenPreferredProject, autoRestorePreferredProjectRef]
  );

  const hasMeaningfulSnapshot = useCallback(
    (
      snapshot: {
        fileStructure: string;
        structureContent: string;
        sandboxFiles: Record<string, string>;
        chat: StoredChatMessageV1[];
      }
    ) => {
      if (Object.keys(snapshot.sandboxFiles || {}).length > 0) return true;
      if ((snapshot.chat || []).length > 0) return true;
      if ((snapshot.fileStructure || '').trim().length > 0) return true;
      const structure = (snapshot.structureContent || '').trim();
      return structure.length > 0 && structure !== REMOTE_SNAPSHOT_EMPTY_STRUCTURE;
    },
    []
  );

  const inferProjectNameFromFiles = useCallback((files: Record<string, string>): string => {
    const priorityPaths = [
      'src/components/layout/Header.tsx',
      'src/components/layout/Header.jsx',
      'src/pages/Home.tsx',
      'src/pages/Home.jsx',
      'src/pages/Index.tsx',
      'src/pages/Index.jsx',
      'components/layout/Header.tsx',
      'components/layout/Header.jsx',
      'app/page.tsx',
      'app/page.jsx',
    ];

    const fileEntries = Object.entries(files || {});
    const prioritySources = priorityPaths
      .map((p) => files[p])
      .filter((v): v is string => typeof v === 'string');
    // Skip admin guard/error pages so headings like "Access denied" are never suggested.
    const nonGuardEntries = fileEntries.filter(([path]) =>
      !/(^|\/)admin\/components\/AdminRouteGuard\.(tsx|jsx)$/.test(path)
    );
    const sources = [
      ...prioritySources,
      ...nonGuardEntries.slice(0, 20).map(([, content]) => content),
    ];

    const normalizeCandidate = (value: string): string => {
      return value.replace(/\s+/g, ' ').trim();
    };

    const normalizeSlug = (value: string): string => {
      return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_.]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    const isGenericCandidate = (value: string): boolean => {
      const cleaned = normalizeCandidate(value);
      if (!cleaned) return true;

      // Reject JSX/template expressions like {siteConfig.name}, ${foo}, etc.
      if (/[{}$]/.test(cleaned)) return true;

      const slug = normalizeSlug(cleaned);
      if (!slug) return true;

      if (/^project-[a-z0-9]{4,12}$/.test(slug)) return true;

      const genericNames = new Set([
        'app',
        'my-app',
        'my-project',
        'project',
        'sandbox-app',
        'sandbox',
        'untitled-project',
        'untitled',
        'ai-website-app',
        'ai-website-export',
        'nextjs-app',
        'react-app',
        'access-denied',
        'access-denied.',
      ]);
      if (genericNames.has(slug)) return true;

      const navLabelNames = new Set([
        'home',
        'dashboard',
        'projects',
        'tasks',
        'auth',
        'features',
        'docs',
        'pricing',
        'about',
        'contact',
        'login',
        'sign-in',
      ]);
      return navLabelNames.has(slug);
    };

    const preferredPatterns = [
      /(?:brand|appName|siteName|projectName)\s*[:=]\s*['"`]([^'"`]{2,80})['"`]/i,
      /<a[^>]*className=["'`][^"'`]*(?:logo|brand|navbar-brand|site-title)[^"'`]*["'`][^>]*>\s*([^<\n]{2,80})\s*<\/a>/i,
      /<a[^>]*href=["'`](?:\/|#)["'`][^>]*>\s*([^<\n]{2,80})\s*<\/a>/i,
      /<h1[^>]*>\s*([^<\n]{2,80})\s*<\/h1>/i,
    ];

    const fallbackPatterns = [/<title>\s*([^<\n]{2,80})\s*<\/title>/i];

    for (const src of sources) {
      if (!src) continue;
      for (const pattern of preferredPatterns) {
        const m = src.match(pattern);
        const candidate = normalizeCandidate(m?.[1] || '');
        if (
          candidate.length >= 2 &&
          candidate.length <= 80 &&
          !isGenericCandidate(candidate)
        ) {
          return candidate;
        }
      }
    }

    for (const src of sources) {
      if (!src) continue;
      for (const pattern of fallbackPatterns) {
        const m = src.match(pattern);
        const candidate = normalizeCandidate(m?.[1] || '');
        if (
          candidate.length >= 2 &&
          candidate.length <= 80 &&
          !isGenericCandidate(candidate)
        ) {
          return candidate;
        }
      }
    }

    return '';
  }, []);

  const suggestProjectName = useCallback((): string => {
    const existing = (conversationContextCurrentProject || '').trim();
    if (existing) return existing;

    // Prefer the canonical name stored in ai-website.json for re-save/rename flows.
    try {
      const aiWebsiteRaw = sandboxFiles?.['ai-website.json'];
      if (aiWebsiteRaw) {
        const aiWebsite = JSON.parse(aiWebsiteRaw) as { project?: { name?: string } };
        const aiWebsiteName = (aiWebsite.project?.name || '').trim();
        if (aiWebsiteName) return aiWebsiteName;
      }
    } catch {
      // ignore malformed ai-website.json
    }

    const inferred = inferProjectNameFromFiles(sandboxFiles);
    if (inferred) return inferred;

    const fallbackId = (activeProjectId || sandboxData?.sandboxId || '').slice(0, 8);
    return fallbackId ? `Project ${fallbackId}` : 'My Project';
  }, [
    conversationContextCurrentProject,
    inferProjectNameFromFiles,
    sandboxFiles,
    activeProjectId,
    sandboxData?.sandboxId,
  ]);

  const integrationReadiness = useMemo(() => {
    const reasons: string[] = [];
    if (!sandboxData?.sandboxId) {
      reasons.push('Create a sandbox first.');
    }
    if (projectOpeningBusy) {
      reasons.push('Project restore is still running.');
    }
    if (loading) {
      reasons.push('Workspace is still loading.');
    }
    if (generationProgressIsGenerating) {
      reasons.push('Generation is still in progress.');
    }
    if (codeApplicationStateStage && codeApplicationStateStage !== 'complete') {
      reasons.push('Code application is still running.');
    }
    const hasSnapshot = hasMeaningfulSnapshot({
      fileStructure,
      structureContent,
      sandboxFiles,
      chat: chatMessagesToStoredRows(chatMessages),
    });
    if (!hasSnapshot) {
      reasons.push('No saved snapshot/files available yet.');
    }
    return {
      ready: reasons.length === 0,
      reasons,
      primaryReason: reasons[0] || null,
    };
  }, [
    sandboxData?.sandboxId,
    projectOpeningBusy,
    loading,
    generationProgressIsGenerating,
    codeApplicationStateStage,
    fileStructure,
    structureContent,
    sandboxFiles,
    chatMessages,
    hasMeaningfulSnapshot,
  ]);

  return {
    resolvePreferredProjectId,
    queueAutoOpenPreferredProject,
    requestAutoRestorePreferredProject,
    hasMeaningfulSnapshot,
    inferProjectNameFromFiles,
    suggestProjectName,
    integrationReadiness,
  };
}
