export interface CloudProjectListItem {
  projectId: string;
  projectName: string;
  updatedAt: number;
  vercelProjectId?: string | null;
  vercelDomainUrl?: string | null;
  vercelDeployedAt?: string | null;
  githubRepoUrl?: string | null;
  pocketbaseUrl?: string | null;
  pocketbaseAdminUrl?: string | null;
}

import type { DatabaseConnectionValue } from '@/components/builder/GenerationDialogs';

export interface SavedGeneratedProjectV1 {
  version: 1;
  generatedCode: string;
  isEdit: boolean;
  appliedFiles: string[];
  savedAt: number;
  sandboxId?: string;
  currentProject?: string;
  databaseConnection?: DatabaseConnectionValue | null;
}

export type AnalyzerIssue = {
  severity?: string;
  file?: string;
  message?: string;
  suggestion?: string;
};
