import { useState, useCallback, useEffect } from 'react';

const ACTIVE_TAB_KEY = 'ai-website:activeTab';

function extractFolderPaths(files: Record<string, string>): Set<string> {
  const folders = new Set<string>(['root']);
  for (const filePath of Object.keys(files)) {
    const parts = filePath.split('/');
    for (let i = 1; i < parts.length; i++) {
      folders.add(parts.slice(0, i).join('/'));
    }
  }
  return folders;
}

function readSavedTab(): 'preview' | 'generation' | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ACTIVE_TAB_KEY);
    if (raw === 'generation' || raw === 'preview') return raw;
  } catch {
    // ignore
  }
  return null;
}

function writeSavedTab(tab: 'preview' | 'generation') {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ACTIVE_TAB_KEY, tab);
  } catch {
    // ignore
  }
}

export function useWorkspaceFiles() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeTab, setActiveTabState] = useState<'generation' | 'preview'>(() => {
    // Default to Code tab if the user previously had it open; otherwise preview.
    return readSavedTab() || 'preview';
  });
  const [sandboxFiles, setSandboxFiles] = useState<Record<string, string>>({});
  const [fileStructure, setFileStructure] = useState<string>('');
  const [structureContent, setStructureContent] = useState('No sandbox created yet');

  const setActiveTab = useCallback((value: 'generation' | 'preview' | ((prev: 'generation' | 'preview') => 'generation' | 'preview')) => {
    setActiveTabState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      writeSavedTab(next);
      return next;
    });
  }, []);

  // When files appear and there is no saved tab preference, switch to Code so
  // the Explorer is visible. This fixes the "Explorer disappears" issue after
  // reload / Supabase project open.
  useEffect(() => {
    const hasFiles = Object.keys(sandboxFiles).length > 0;
    const savedTab = readSavedTab();
    if (hasFiles && !savedTab && activeTab === 'preview') {
      setActiveTabState('generation');
      writeSavedTab('generation');
    }
  }, [sandboxFiles, activeTab]);

  // Auto-expand all folders whenever the file set changes
  useEffect(() => {
    const allFolders = extractFolderPaths(sandboxFiles);
    if (allFolders.size === 0) return;
    setExpandedFolders((prev) => {
      const merged = new Set([...prev, ...allFolders]);
      if (merged.size === prev.size) return prev;
      return merged;
    });
  }, [sandboxFiles]);

  const toggleFolder = useCallback((folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  }, []);

  const handleFileClick = useCallback((filePath: string) => {
    setSelectedFile(filePath);
  }, []);

  return {
    expandedFolders,
    setExpandedFolders,
    selectedFile,
    setSelectedFile,
    activeTab,
    setActiveTab,
    sandboxFiles,
    setSandboxFiles,
    fileStructure,
    setFileStructure,
    structureContent,
    setStructureContent,
    toggleFolder,
    handleFileClick,
  };
}
