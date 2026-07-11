import { useRef, useCallback, useEffect } from 'react';
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import { submitPreviewErrorForFix as _submitPreviewErrorForFix } from '@/lib/generation/submitPreviewErrorForFix';
import {
  buildPreviewErrorFixPrompt,
  buildPreviewHealthFixPrompt,
  PREVIEW_FIX_CHAIN_OF_THOUGHT,
} from '@/lib/generation/previewErrorFixPrompt';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import type { ChatMessage } from '@/hooks/useWorkspaceChat';

export interface PreviewErrorsDeps {
  sandboxData: SandboxData | null;
  previewError: string | null;
  setPreviewError: (v: string | null) => void;
  previewHealthIssue: string | null;
  setPreviewHealthIssue: (v: string | null) => void;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
  sendChatMessageRef: MutableRefObject<((input?: import('./useAgentChatMessage').SendChatMessageInput) => Promise<void>) | null>;
  forceNextMessageAsEditRef: MutableRefObject<boolean>;
  setActiveTab: Dispatch<SetStateAction<'preview' | 'generation'>>;
  installPackages: (packages: string[]) => Promise<void>;
  reloadPreview: () => Promise<void>;
  latestPreviewErrorRef: MutableRefObject<string | null>;
  lastPreviewErrorTextRef: MutableRefObject<string>;
  lastPreviewErrorAtRef: MutableRefObject<number>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function extractPackageNameFromImportPath(importPath: string): string | null {
  const source = importPath.trim();
  if (!source || source.startsWith('.') || source.startsWith('/') || source.startsWith('@/') || source.startsWith('~/')) {
    return null;
  }
  if (source.startsWith('@')) {
    const [scope, name] = source.split('/');
    if (!scope || !name) return null;
    return `${scope}/${name}`;
  }
  const [name] = source.split('/');
  return name || null;
}

function getMissingLocalImportsFromPreviewError(
  errorText: string
): Array<{ importSource: string; importerPath: string }> {
  const issues: Array<{ importSource: string; importerPath: string }> = [];
  const matches = Array.from(
    errorText.matchAll(/Failed to resolve import\s+["']([^"']+)["']\s+from\s+["']([^"']+)["']/gi)
  );
  for (const match of matches) {
    const importSource = (match[1] || '').trim();
    const importerPath = (match[2] || '').trim();
    if (!importSource || !importerPath) continue;
    if (importSource.startsWith('.') || importSource.startsWith('/') || importSource.startsWith('@/')) {
      issues.push({ importSource, importerPath });
    }
  }
  return issues;
}

function resolveMissingImportSuggestion(importerPath: string, importSource: string): string {
  const source = importSource.trim();

  // Handle @/ alias -> map to src/ (project-root-relative, independent of importer location)
  if (source.startsWith('@/')) {
    const base = source.replace(/^@\//, 'src/');
    const candidates = [
      `${base}.jsx`,
      `${base}.tsx`,
      `${base}.js`,
      `${base}.ts`,
      `${base}/index.jsx`,
      `${base}/index.tsx`,
      `${base}/index.js`,
      `${base}/index.ts`,
    ];
    return candidates[0];
  }

  const cleanedImporter = importerPath.replace(/^\/home\/user\/app\//, '');
  const importerParts = cleanedImporter.split('/').filter(Boolean);
  importerParts.pop();
  const sourceParts = source.split('/');
  const stack = [...importerParts];
  for (const part of sourceParts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  const base = stack.join('/');
  const candidates = [
    `${base}.jsx`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.ts`,
    `${base}/index.jsx`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.ts`,
  ];
  return candidates[0];
}

function buildMissingLocalImportFixPrompt(
  rawError: string,
  issues: Array<{ importSource: string; importerPath: string }>
): string {
  const issueLines = issues
    .slice(0, 6)
    .map((issue, idx) => {
      const suggested = resolveMissingImportSuggestion(issue.importerPath, issue.importSource);
      return `${idx + 1}. Import "${issue.importSource}" in "${issue.importerPath}" is unresolved. Suggested file path: "${suggested}".`;
    })
    .join('\n');

  const err = rawError.trim();
  return (
    `### Local import resolution (preview)\n` +
    `Unresolved imports were detected in the View panel.\n\n` +
    `#### Error report\n\`\`\`text\n${err}\n\`\`\`\n\n` +
    `#### Missing local imports\n${issueLines}\n\n` +
    `#### Rules for this fix\n` +
    `- Fix unresolved local imports with the minimum edits.\n` +
    `- Prefer creating the missing component/module file when the import path is correct.\n` +
    `- If a similarly named file already exists, update the import path instead.\n` +
    `- Ensure default-imported React components export default when required.\n` +
    `- Avoid unrelated refactors.\n\n` +
    `${PREVIEW_FIX_CHAIN_OF_THOUGHT}\n`
  );
}

function getMissingPackagesFromPreviewError(errorText: string): string[] {
  const matches = Array.from(errorText.matchAll(/Failed to resolve import\s+["']([^"']+)["']/gi));
  if (matches.length === 0) return [];

  const blocked = new Set(['react', 'react-dom']);
  const packages = new Set<string>();

  for (const match of matches) {
    const importPath = (match[1] || '').trim();
    const packageName = extractPackageNameFromImportPath(importPath);
    if (!packageName || blocked.has(packageName)) continue;
    packages.add(packageName);
  }

  return Array.from(packages);
}

export function usePreviewErrors(deps: PreviewErrorsDeps) {
  const {
    sandboxData,
    previewError,
    setPreviewError,
    previewHealthIssue,
    setPreviewHealthIssue,
    addChatMessage,
    sendChatMessageRef,
    forceNextMessageAsEditRef,
    setActiveTab,
    installPackages,
    reloadPreview,
    latestPreviewErrorRef,
    lastPreviewErrorTextRef,
    lastPreviewErrorAtRef,
  } = deps;

  const submitPreviewErrorForFixRef = useRef<(rawError: string) => Promise<void>>(
    async () => {}
  );
  const submitPreviewHealthForFixRef = useRef<(issueText: string) => Promise<void>>(
    async () => {}
  );
  const autoInstallInFlightRef = useRef(false);
  const missingPackageInstallAttemptsRef = useRef<Record<string, number>>({});
  const autoPreviewRepairInFlightRef = useRef(false);

  const tryAutoInstallMissingPackagesFromError = useCallback(
    async (errorText: string): Promise<boolean> => {
      if (!sandboxData || autoInstallInFlightRef.current) return false;

      const detectedPackages = getMissingPackagesFromPreviewError(errorText);
      if (detectedPackages.length === 0) return false;

      const MAX_AUTO_INSTALL_ATTEMPTS = 2;
      const installablePackages = detectedPackages.filter((pkg) => {
        const attempts = missingPackageInstallAttemptsRef.current[pkg] || 0;
        return attempts < MAX_AUTO_INSTALL_ATTEMPTS;
      });

      if (installablePackages.length === 0) return false;

      autoInstallInFlightRef.current = true;
      installablePackages.forEach((pkg) => {
        missingPackageInstallAttemptsRef.current[pkg] =
          (missingPackageInstallAttemptsRef.current[pkg] || 0) + 1;
      });

      try {
        addChatMessage(
          `Detected missing package import${installablePackages.length > 1 ? 's' : ''}: ${installablePackages.join(', ')}. Installing automatically...`,
          'system'
        );
        await installPackages(installablePackages);
        await reloadPreview();
        return true;
      } catch (error: unknown) {
        addChatMessage(
          `Automatic package install failed: ${getErrorMessage(error)}. Falling back to AI code repair.`,
          'system'
        );
        return false;
      } finally {
        autoInstallInFlightRef.current = false;
      }
    },
    [sandboxData, addChatMessage, installPackages, reloadPreview]
  );

  const submitPreviewErrorForFix = useCallback(
    async (rawError: string) => {
      await _submitPreviewErrorForFix(rawError, {
        autoPreviewRepairInFlightRef,
        tryAutoInstallMissingPackagesFromError,
        addChatMessage,
        setPreviewError,
        setPreviewHealthIssue,
        setActiveTab,
        getMissingLocalImportsFromPreviewError,
        buildMissingLocalImportFixPrompt,
        buildPreviewErrorFixPrompt,
        forceNextMessageAsEditRef,
        sendChatMessageRef,
        PREVIEW_FIX_CHAIN_OF_THOUGHT,
      });
    },
    [
      tryAutoInstallMissingPackagesFromError,
      addChatMessage,
      setPreviewError,
      setPreviewHealthIssue,
      setActiveTab,
      forceNextMessageAsEditRef,
      sendChatMessageRef,
    ]
  );

  submitPreviewErrorForFixRef.current = submitPreviewErrorForFix;

  const submitPreviewHealthForFix = useCallback(
    async (issueText: string) => {
      const issue = issueText.trim();
      if (!issue) return;

      // Guard against double-clicks
      if (autoPreviewRepairInFlightRef.current) {
        return;
      }
      autoPreviewRepairInFlightRef.current = true;

      setPreviewHealthIssue(null);
      setPreviewError(null);
      addChatMessage('Strengthening the code...', 'system');
      setActiveTab('generation');
      forceNextMessageAsEditRef.current = true;
      if (sendChatMessageRef.current) {
        void sendChatMessageRef.current({ visible: 'Strengthening the code...', llm: buildPreviewHealthFixPrompt(issue) });
      }
    },
    [
      addChatMessage,
      setPreviewHealthIssue,
      setPreviewError,
      setActiveTab,
      forceNextMessageAsEditRef,
      sendChatMessageRef,
    ]
  );

  submitPreviewHealthForFixRef.current = submitPreviewHealthForFix;

  const handleFixPreviewError = useCallback(() => {
    if (!previewError?.trim()) return;
    void submitPreviewErrorForFix(previewError);
  }, [previewError, submitPreviewErrorForFix]);

  const handleFixPreviewHealthIssue = useCallback(() => {
    const issue = previewHealthIssue?.trim();
    if (!issue) return;
    setPreviewHealthIssue(null);
    addChatMessage('Strengthening the code...', 'system');
    setActiveTab('generation');
    forceNextMessageAsEditRef.current = true;
    void sendChatMessageRef.current?.({ visible: 'Strengthening the code...', llm: buildPreviewHealthFixPrompt(issue) });
  }, [
    previewHealthIssue,
    setPreviewHealthIssue,
    addChatMessage,
    setActiveTab,
    forceNextMessageAsEditRef,
    sendChatMessageRef,
  ]);

  const handleCopyPreviewError = useCallback(async () => {
    const err = previewError?.trim();
    if (!err) return;
    if (!navigator?.clipboard?.writeText) {
      addChatMessage('Copy failed: clipboard access is not available in this browser.', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(err);
      addChatMessage('Copied View panel error details to clipboard.', 'system');
    } catch {
      addChatMessage('Copy failed: unable to write error details to clipboard.', 'error');
    }
  }, [previewError, addChatMessage]);

  useEffect(() => {
    latestPreviewErrorRef.current = null;
    lastPreviewErrorTextRef.current = '';
    lastPreviewErrorAtRef.current = 0;
    setPreviewError(null);
    setPreviewHealthIssue(null);
  }, [sandboxData?.sandboxId]);

  useEffect(() => {
    latestPreviewErrorRef.current = previewError;
  }, [previewError]);

  return {
    submitPreviewErrorForFixRef,
    submitPreviewHealthForFixRef,
    autoInstallInFlightRef,
    missingPackageInstallAttemptsRef,
    autoPreviewRepairInFlightRef,
    submitPreviewErrorForFix,
    submitPreviewHealthForFix,
    handleFixPreviewError,
    handleFixPreviewHealthIssue,
    handleCopyPreviewError,
    tryAutoInstallMissingPackagesFromError,
  };
}
