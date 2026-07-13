'use client';

import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { GenerationCognitionLoader, GenerationOrb, GenerationThinkingStrip } from '@/components/builder/GenerationCognitionLoader';
import { GenerationFileExplorer } from '@/components/generation/GenerationFileExplorer';
import { GenerationPreviewPanel, type GenerationPreviewPanelProps } from '@/components/generation/GenerationPreviewPanel';
import { cn } from '@/utils/cn';
import { X, FileCode2 } from 'lucide-react';

export interface GenerationWorkspaceProps {
  workspace: GenerationPreviewPanelProps & {
    activeTab: 'generation' | 'preview';
    codeDisplayRef: React.RefObject<HTMLDivElement>;
    expandedFolders: Set<string>;
    setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
    generationEstimatedPercent: number;
    handleFileClick: (filePath: string) => void;
    handlePreviewIframeLoad: () => void;
    selectedFile: string | null;
    setSelectedFile: React.Dispatch<React.SetStateAction<string | null>>;
    status?: string;
    toggleFolder: (folderPath: string) => void;
    renameSandboxFile?: (oldPath: string, newName: string) => Promise<void> | void;
    deleteSandboxFile?: (path: string) => Promise<void> | void;
  };
}

const MIN_EXPLORER_WIDTH = 160;
const MAX_EXPLORER_WIDTH = 600;
const DEFAULT_EXPLORER_WIDTH = 220;

function GenerationWorkspace({ workspace }: GenerationWorkspaceProps) {
  const {
    activeTab, codeApplicationState, codeDisplayRef, expandedFolders,
    fileStructure, generationEstimatedPercent, generationProgress,
    handleFileClick, handlePreviewIframeLoad, iframeRef, isCapturingScreenshot,
    isPreparingDesign, isScreenshotLoaded, isStartingNewGeneration, loading,
    loadingStage, previewHealthIssue, previewError, sandboxData,
    sandboxFiles, screenshotError, selectedFile, setExpandedFolders,
    setIsScreenshotLoaded, setPreviewHealthIssue, setPreviewError,
    setSelectedFile, toggleFolder, urlScreenshot, visualEditingSelectedComponent,
    visualSelectMode, reloadPreview, handleCopyPreviewError, handleFixPreviewError,
    handleFixPreviewHealthIssue, reviewMaxReached, reviewMaxIssues,
    onContinueFixing, onStopAndRender, renameSandboxFile, deleteSandboxFile,
  } = workspace;

  const [explorerWidth, setExplorerWidth] = useState(DEFAULT_EXPLORER_WIDTH);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(DEFAULT_EXPLORER_WIDTH);
  const autoScrollEnabledRef = useRef(true);
  const streamedFilePathRef = useRef<string | null>(null);


  useEffect(() => {
    if (generationProgress.isGenerating && generationProgress.currentFile) {
      const path = generationProgress.currentFile.path;
      setSelectedFile(path);

      // Expand the root plus all parent folders so the current file is
      // visible in the explorer.
      const parts = path.split('/');
      const foldersToExpand = new Set(expandedFolders);
      let changed = false;
      if (!foldersToExpand.has('root')) {
        foldersToExpand.add('root');
        changed = true;
      }
      for (let i = 1; i < parts.length; i++) {
        const folder = parts.slice(0, i).join('/');
        if (!foldersToExpand.has(folder)) {
          foldersToExpand.add(folder);
          changed = true;
        }
      }
      if (changed) {
        setExpandedFolders(foldersToExpand);
      }
    }
    if (!generationProgress.isGenerating && !generationProgress.isStreaming) {
      setSelectedFile(null);
    }
  }, [
    generationProgress.currentFile,
    generationProgress.isGenerating,
    generationProgress.isStreaming,
    setSelectedFile,
    expandedFolders,
    setExpandedFolders,
  ]);

  const handleCodeScroll = useCallback(() => {
    const el = codeDisplayRef.current;
    if (!el) return;
    const threshold = 80;
    autoScrollEnabledRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, [codeDisplayRef]);

  useEffect(() => {
    const currentPath = generationProgress.currentFile?.path;
    if (currentPath && currentPath !== streamedFilePathRef.current) {
      streamedFilePathRef.current = currentPath;
      autoScrollEnabledRef.current = true;
    }

    if (!generationProgress.isStreaming || !generationProgress.currentFile) return;

    const el = codeDisplayRef.current;
    if (!el || !autoScrollEnabledRef.current) return;

    el.scrollTop = el.scrollHeight;
  }, [
    generationProgress.currentFile,
    generationProgress.isStreaming,
    codeDisplayRef,
  ]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = explorerWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    // Prevent text selection / focus issues
    e.preventDefault();
  }, [explorerWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientX - dragStartXRef.current;
      const newWidth = Math.max(
        MIN_EXPLORER_WIDTH,
        Math.min(MAX_EXPLORER_WIDTH, dragStartWidthRef.current + delta)
      );
      setExplorerWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (activeTab === 'generation') {
    return (
      <div className="absolute inset-0 flex overflow-hidden">
        {/* File Explorer */}
        {!generationProgress.isEdit && (
          <>
            <GenerationFileExplorer
              files={generationProgress.files}
              expandedFolders={expandedFolders}
              selectedFile={selectedFile}
              onToggleFolder={toggleFolder}
              onSelectFile={handleFileClick}
              width={explorerWidth}
              onRenameFile={renameSandboxFile}
              onDeleteFile={deleteSandboxFile}
            />
            {/* Draggable Resizer */}
            <div
              onMouseDown={handleMouseDown}
              className="w-2 flex-shrink-0 cursor-col-resize bg-transparent hover:bg-white/[0.08] active:bg-white/[0.15] transition-colors relative z-10 -ml-1"
              style={{ cursor: 'col-resize' }}
            />
          </>
        )}

        {/* Code Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950/30">
          {/* Thinking strip */}
          {generationProgress.isGenerating && (generationProgress.isThinking || generationProgress.thinkingText) && (
            <GenerationThinkingStrip
              isThinking={generationProgress.isThinking}
              thinkingDuration={generationProgress.thinkingDuration}
              thinkingText={generationProgress.thinkingText}
            />
          )}

          {/* Live Code Display */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-3 sm:p-4">
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide" ref={codeDisplayRef} onScroll={handleCodeScroll}>
              {/* Active file takes priority so each file opens as it is written. */}
              {selectedFile ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-black/40">
                    {/* File header */}
                    <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {generationProgress.currentFile?.path === selectedFile ? (
                          <GenerationOrb size="xs" className="shrink-0" />
                        ) : (
                          <FileCode2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        )}
                        <span className="font-mono text-xs text-zinc-300 truncate">{selectedFile}</span>
                        {generationProgress.currentFile?.path === selectedFile && (
                          <span className="text-[10px] text-glow-cyan animate-pulse shrink-0 font-medium">● streaming</span>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="rounded p-1 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {/* Code */}
                    <div className="bg-black/30">
                      {(() => {
                        const streamingThisFile =
                          generationProgress.isStreaming &&
                          generationProgress.currentFile?.path === selectedFile;
                        const content = (() => {
                          if (generationProgress.currentFile && generationProgress.currentFile.path === selectedFile) {
                            return generationProgress.currentFile.content;
                          }
                          const file = generationProgress.files.find(f => f.path === selectedFile);
                          return file?.content || '// File content will appear here';
                        })();

                        // During active streaming, use a lightweight <pre> instead
                        // of SyntaxHighlighter so the browser stays responsive while
                        // hundreds of token updates arrive.
                        if (streamingThisFile) {
                          return (
                            <pre className="m-0 whitespace-pre p-3 font-mono text-[0.8125rem] leading-relaxed text-zinc-200">
                              {content}
                              <span className="ml-1 inline-block h-3 w-2 animate-pulse rounded-sm bg-glow-cyan/80" />
                            </pre>
                          );
                        }

                        return (
                          <>
                            <SyntaxHighlighter
                              language={(() => {
                                const ext = selectedFile.split('.').pop()?.toLowerCase();
                                if (ext === 'css') return 'css';
                                if (ext === 'json') return 'json';
                                if (ext === 'html') return 'html';
                                return 'jsx';
                              })()}
                              style={vscDarkPlus}
                              customStyle={{
                                margin: 0,
                                padding: '0.75rem 1rem',
                                fontSize: '0.8125rem',
                                background: 'transparent',
                                lineHeight: 1.6,
                              }}
                              showLineNumbers={true}
                            >
                              {content}
                            </SyntaxHighlighter>
                            {generationProgress.currentFile?.path === selectedFile && (
                              <span className="ml-4 mb-3 inline-block h-3 w-2 animate-pulse rounded-sm bg-glow-cyan/80" />
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : generationProgress.isThinking || (generationProgress.isGenerating && !generationProgress.currentFile) ? (
                <GenerationCognitionLoader
                  title="AI is analyzing your request"
                  subtitle={generationProgress.status || 'Mapping structure, dependencies, and UI intent…'}
                  progress={generationEstimatedPercent}
                  autoProgress
                  taskId={`analysis:${generationProgress.status || "mapping"}`}
                  steps={[
                    { label: 'Parse request', key: 'parse' },
                    { label: 'Plan structure', key: 'plan' },
                    { label: 'Generate code', key: 'generate' },
                  ]}
                  activeStep={generationProgress.isGenerating ? 2 : generationProgress.status ? 1 : 0}
                />
              ) : generationProgress.currentFile ? (
                <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-black/40">
                  <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <GenerationOrb size="xs" className="shrink-0" />
                      <span className="truncate font-mono text-xs text-zinc-300">{generationProgress.currentFile.path}</span>
                      <span className={cn(
                        'shrink-0 rounded px-1.5 py-px text-[10px] font-medium',
                        generationProgress.currentFile.type === 'css' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' :
                        generationProgress.currentFile.type === 'javascript' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                        generationProgress.currentFile.type === 'json' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                        'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20'
                      )}>
                        {generationProgress.currentFile.type === 'javascript' ? 'JSX' : generationProgress.currentFile.type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="bg-black/30">
                    {generationProgress.isStreaming ? (
                      <pre className="m-0 whitespace-pre p-3 font-mono text-[0.75rem] leading-relaxed text-zinc-200">
                        {generationProgress.currentFile.content}
                        <span className="ml-1 inline-block h-3 w-2 animate-pulse rounded-sm bg-glow-cyan/80" />
                      </pre>
                    ) : (
                      <>
                        <SyntaxHighlighter
                          language={
                            generationProgress.currentFile.type === 'css' ? 'css' :
                            generationProgress.currentFile.type === 'json' ? 'json' :
                            generationProgress.currentFile.type === 'html' ? 'html' :
                            'jsx'
                          }
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            padding: '0.75rem 1rem',
                            fontSize: '0.75rem',
                            background: 'transparent',
                            lineHeight: 1.6,
                          }}
                          showLineNumbers={true}
                        >
                          {generationProgress.currentFile.content}
                        </SyntaxHighlighter>
                        <span className="ml-4 mb-3 inline-block h-3 w-2 animate-pulse rounded-sm bg-glow-cyan/80" />
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                    <FileCode2 className="h-4 w-4 text-zinc-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-400">
                      {generationProgress.files.length > 0
                        ? `${generationProgress.files.length} files generated`
                        : 'No files yet'}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-600">
                      {generationProgress.files.length > 0
                        ? 'Select a file from the explorer to view its contents'
                        : 'Start chatting to generate code'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Component progress */}
          {generationProgress.components.length > 0 && (
            <div className="px-4 pb-3">
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="h-full bg-gradient-to-r from-glow-purple via-glow-cyan to-glow-purple transition-all duration-500"
                  style={{
                    width: `${(generationProgress.currentComponent / Math.max(generationProgress.components.length, 1)) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-zinc-600">
                Component {generationProgress.currentComponent + 1} of {generationProgress.components.length}
              </p>
            </div>
          )}
        </div>

        {/* Hidden iframe for health pings */}
        {sandboxData?.url ? (
          <iframe
            ref={iframeRef}
            src={sandboxData.url}
            className="pointer-events-none absolute -left-[9999px] top-0 h-px w-px opacity-0"
            title="AI-Website sandbox preview background"
            allow="clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            onLoad={handlePreviewIframeLoad}
            aria-hidden
          />
        ) : null}
      </div>
    );
  } else if (activeTab === 'preview') {
    return (
      <GenerationPreviewPanel
        sandboxData={sandboxData}
        iframeRef={iframeRef}
        onPreviewIframeLoad={handlePreviewIframeLoad}
        isCapturingScreenshot={isCapturingScreenshot}
        isPreparingDesign={isPreparingDesign}
        isStartingNewGeneration={isStartingNewGeneration}
        loading={loading}
        loadingStage={loadingStage}
        urlScreenshot={urlScreenshot}
        isScreenshotLoaded={isScreenshotLoaded}
        setIsScreenshotLoaded={setIsScreenshotLoaded}
        screenshotError={screenshotError}
        generationProgress={generationProgress}
        previewError={previewError}
        previewHealthIssue={previewHealthIssue}
        setPreviewError={setPreviewError}
        setPreviewHealthIssue={setPreviewHealthIssue}
        handleCopyPreviewError={handleCopyPreviewError}
        handleFixPreviewError={handleFixPreviewError}
        handleFixPreviewHealthIssue={handleFixPreviewHealthIssue}
        codeApplicationState={codeApplicationState}
        reviewMaxReached={reviewMaxReached}
        reviewMaxIssues={reviewMaxIssues}
        onContinueFixing={onContinueFixing}
        onStopAndRender={onStopAndRender}
        visualSelectMode={visualSelectMode}
        visualEditingSelectedComponent={visualEditingSelectedComponent}
        sandboxFiles={sandboxFiles}
        fileStructure={fileStructure}
        reloadPreview={reloadPreview}
      />
    );
  }
  return null;
}

export const GenerationWorkspaceMemo = memo(GenerationWorkspace);
export { GenerationWorkspaceMemo as GenerationWorkspace };
