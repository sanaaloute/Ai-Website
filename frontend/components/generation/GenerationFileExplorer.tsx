'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { BsFolderFill, BsFolder2Open } from '@/lib/icons';
import { FiChevronDown, FiChevronRight, FiEdit2, FiTrash2 } from '@/lib/icons';
import { FileIcon } from '@/components/generation/FileIcon';

interface GenerationFile {
  path: string;
  content: string;
  type: string;
  edited?: boolean;
}

export interface GenerationFileExplorerProps {
  files: GenerationFile[];
  expandedFolders: Set<string>;
  selectedFile: string | null;
  onToggleFolder: (folder: string) => void;
  onSelectFile: (path: string) => void;
  onRenameFile?: (oldPath: string, newName: string) => Promise<void> | void;
  onDeleteFile?: (path: string) => Promise<void> | void;
  width?: number;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  edited?: boolean;
  children: TreeNode[];
}

function buildTree(files: GenerationFile[]): TreeNode {
  const root: TreeNode = { name: 'project', path: '', type: 'folder', children: [] };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const childPath = parts.slice(0, i + 1).join('/');

      let child = current.children.find(c => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: childPath,
          type: isFile ? 'file' : 'folder',
          edited: isFile ? file.edited : undefined,
          children: isFile ? [] : [],
        };
        current.children.push(child);
      } else if (isFile) {
        child.edited = file.edited;
      }

      current = child;
    }
  }

  function sortNode(node: TreeNode) {
    node.children.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
    node.children.forEach(sortNode);
  }
  sortNode(root);

  return root;
}

function TreeNodeItem({
  node,
  depth,
  expandedFolders,
  selectedFile,
  onToggleFolder,
  onSelectFile,
  onRenameFile,
  onDeleteFile,
}: {
  node: TreeNode;
  depth: number;
  expandedFolders: Set<string>;
  selectedFile: string | null;
  onToggleFolder: (folder: string) => void;
  onSelectFile: (path: string) => void;
  onRenameFile?: (oldPath: string, newName: string) => Promise<void> | void;
  onDeleteFile?: (path: string) => Promise<void> | void;
}) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = node.type === 'file' && selectedFile === node.path;
  const hasChildren = node.type === 'folder' && node.children.length > 0;
  const canModify = node.path !== '' && !!onRenameFile && !!onDeleteFile;
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [isBusy, setIsBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const startRename = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
    setRenameValue(node.name);
  }, [node.name]);

  const submitRename = useCallback(async () => {
    if (!onRenameFile || renameValue.trim() === node.name) {
      setIsRenaming(false);
      return;
    }
    setIsBusy(true);
    try {
      await onRenameFile(node.path, renameValue.trim());
    } finally {
      setIsBusy(false);
      setIsRenaming(false);
    }
  }, [onRenameFile, renameValue, node.path, node.name]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void submitRename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsRenaming(false);
        setRenameValue(node.name);
      }
    },
    [submitRename, node.name]
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onDeleteFile) return;
      setIsBusy(true);
      try {
        await onDeleteFile(node.path);
      } finally {
        setIsBusy(false);
      }
    },
    [onDeleteFile, node.path]
  );

  const label = (
    <span className={`text-xs flex items-center gap-1 flex-1 min-w-0 truncate ${isSelected ? 'font-medium' : ''}`}>
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={submitRename}
          onClick={(e) => e.stopPropagation()}
          disabled={isBusy}
          className="w-full min-w-0 rounded bg-black/60 px-1 py-0.5 text-xs text-zinc-200 outline-none ring-1 ring-glow-purple/40 focus:ring-glow-purple"
        />
      ) : (
        <>
          {node.name}
          {node.edited && (
            <span
              className={`text-[8px] px-1 rounded ${
                isSelected ? 'bg-glow-purple/30 text-glow-purple' : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              mod
            </span>
          )}
        </>
      )}
    </span>
  );

  const actionButtons = canModify && !isRenaming ? (
    <span className="ml-auto hidden items-center gap-1 pl-1 group-hover:flex">
      <button
        type="button"
        onClick={startRename}
        disabled={isBusy}
        title="Rename"
        className="rounded p-0.5 text-zinc-500 transition hover:bg-white/[0.08] hover:text-zinc-300 disabled:opacity-50"
      >
        <FiEdit2 style={{ width: '10px', height: '10px' }} />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isBusy}
        title="Delete"
        className="rounded p-0.5 text-zinc-500 transition hover:bg-red-500/15 hover:text-red-400 disabled:opacity-50"
      >
        <FiTrash2 style={{ width: '10px', height: '10px' }} />
      </button>
    </span>
  ) : null;

  if (node.type === 'file') {
    return (
      <div
        className={`group flex items-center gap-1.5 py-[3px] px-2 rounded cursor-pointer transition-all ${
          isSelected
            ? 'bg-glow-purple/15 text-glow-purple border-l-2 border-glow-purple'
            : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 border-l-2 border-transparent'
        }`}
        style={{ paddingLeft: `${10 + depth * 14}px` }}
        onClick={() => onSelectFile(node.path)}
      >
        <FileIcon fileName={node.name} />
        {label}
        {actionButtons}
      </div>
    );
  }

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 py-[3px] px-2 hover:bg-white/[0.04] rounded cursor-pointer text-zinc-500 transition-colors border-l-2 border-transparent"
        style={{ paddingLeft: `${10 + depth * 14}px` }}
        onClick={() => onToggleFolder(node.path)}
      >
        {hasChildren ? (
          isExpanded ? (
            <FiChevronDown style={{ width: '12px', height: '12px' }} className="text-zinc-600 shrink-0" />
          ) : (
            <FiChevronRight style={{ width: '12px', height: '12px' }} className="text-zinc-600 shrink-0" />
          )
        ) : (
          <span className="w-[12px] shrink-0" />
        )}
        {isExpanded ? (
          <BsFolder2Open style={{ width: '14px', height: '14px' }} className="text-amber-500/70 shrink-0" />
        ) : (
          <BsFolderFill style={{ width: '14px', height: '14px' }} className="text-amber-500/70 shrink-0" />
        )}
        {label}
        {actionButtons}
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              selectedFile={selectedFile}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
              onRenameFile={onRenameFile}
              onDeleteFile={onDeleteFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function GenerationFileExplorer({
  files,
  expandedFolders,
  selectedFile,
  onToggleFolder,
  onSelectFile,
  onRenameFile,
  onDeleteFile,
  width = 220,
}: GenerationFileExplorerProps) {
  const tree = useMemo(() => buildTree(files), [files]);
  const rootExpanded = expandedFolders.has('root');

  return (
    <div
      className="border-r border-white/[0.06] bg-black/40 flex flex-col flex-shrink-0"
      style={{ width }}
    >
      <div className="px-3 py-2 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <BsFolderFill style={{ width: '14px', height: '14px' }} className="text-amber-500/70" />
          <span className="text-sm font-medium text-zinc-500">Explorer</span>
        </div>
        <span className="text-xs text-zinc-600">{files.length} files</span>
      </div>

      <div className="flex-1 overflow-y-auto py-1 scrollbar-hide">
        <div>
          {/* Root project folder */}
          <div
            className="flex items-center gap-1.5 py-[3px] px-2 hover:bg-white/[0.04] rounded cursor-pointer text-zinc-500 transition-colors border-l-2 border-transparent"
            onClick={() => onToggleFolder('root')}
          >
            {rootExpanded ? (
              <FiChevronDown style={{ width: '12px', height: '12px' }} className="text-zinc-600 shrink-0" />
            ) : (
              <FiChevronRight style={{ width: '12px', height: '12px' }} className="text-zinc-600 shrink-0" />
            )}
            {rootExpanded ? (
              <BsFolder2Open style={{ width: '14px', height: '14px' }} className="text-glow-cyan/70 shrink-0" />
            ) : (
              <BsFolderFill style={{ width: '14px', height: '14px' }} className="text-glow-cyan/70 shrink-0" />
            )}
            <span className="text-xs font-medium text-zinc-400">project</span>
          </div>

          {rootExpanded && (
            <div className="ml-4">
              {tree.children.map(child => (
                <TreeNodeItem
                  key={child.path}
                  node={child}
                  depth={0}
                  expandedFolders={expandedFolders}
                  selectedFile={selectedFile}
                  onToggleFolder={onToggleFolder}
                  onSelectFile={onSelectFile}
                  onRenameFile={onRenameFile}
                  onDeleteFile={onDeleteFile}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
