import { useCallback } from 'react';

import type { ChatMessage, ConversationContext } from '@/hooks/useWorkspaceChat';
import type { GenerationFile, GenerationProgress, GenerationTodoItem } from '@/hooks/useGenerationProgress';
import { classifyGatewayError } from '@/lib/generation/pageUtils';

/** Module-level store for packages detected during stream parsing.
 *  getPendingPackages() atomically reads and clears the store to prevent races. */
let pendingPackagesStore: string[] = [];

export function setPendingPackages(packages: string[]): void {
  pendingPackagesStore = packages;
}

export function getPendingPackages(): string[] {
  const pkgs = pendingPackagesStore;
  pendingPackagesStore = [];
  return pkgs;
}

function computeEstimatedPercent(
  completedFiles: number,
  hasCurrentFile: boolean,
  isStreaming: boolean,
  isComplete: boolean
): number {
  if (isComplete) return 100;
  if (!isStreaming && completedFiles === 0) return 3; // Planning / initializing
  // Smoother curve: first file is a big milestone, then diminishing returns
  // Cap at 75% until apply phase, 95% until complete
  const currentFileBonus = hasCurrentFile ? 3 : 0;
  if (completedFiles === 0) {
    // Streaming but no complete files yet — early generation stage
    return 8 + currentFileBonus;
  }
  // Logarithmic-ish scaling so progress doesn't jump to 90% with many files
  const fileProgress = Math.min(72, completedFiles * 6 + currentFileBonus);
  return 12 + fileProgress;
}

function markTodoDone(todoList: GenerationTodoItem[], label: string): GenerationTodoItem[] {
  return todoList.map(t => t.label === label ? { ...t, done: true } : t);
}

function updateTodoFromStatus(
  todoList: GenerationTodoItem[],
  status: string,
  isStreaming: boolean,
  completedFiles: number
): GenerationTodoItem[] {
  const normalized = status.toLowerCase();
  let list = todoList.length > 0 ? todoList : [
    { label: 'Planning', done: false },
    { label: 'Generating code', done: false },
    { label: 'Analyzing code', done: false },
    { label: 'Applying changes', done: false },
  ];

  // Planning phase: active during initialization statuses
  if (normalized.includes('plan') || normalized.includes('initializ') || normalized.includes('search')) {
    list = list.map(t => t.label === 'Planning' ? { ...t, done: false } : t);
  }
  // Once streaming starts or files are parsed, planning and generating are done
  if (isStreaming || completedFiles > 0 || normalized.includes('generat') || normalized.includes('stream')) {
    list = markTodoDone(list, 'Planning');
    list = markTodoDone(list, 'Generating code');
  }
  // Analysis / install phase marks generating done
  if (normalized.includes('analyz') || normalized.includes('install')) {
    list = markTodoDone(list, 'Planning');
    list = markTodoDone(list, 'Generating code');
  }
  // Applying changes
  if (normalized.includes('apply') || normalized.includes('creat') || normalized.includes('file')) {
    list = markTodoDone(list, 'Planning');
    list = markTodoDone(list, 'Generating code');
  }
  return list;
}

export interface ChatStreamParserDeps {
  setGenerationProgress: React.Dispatch<React.SetStateAction<GenerationProgress>>;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
  setConversationContext: React.Dispatch<React.SetStateAction<ConversationContext>>;
  setQuotaErrorText: (text: string) => void;
  setShowQuotaDialog: (show: boolean) => void;
  setActiveTab: React.Dispatch<React.SetStateAction<'preview' | 'generation'>>;
}

export interface ChatStreamResult {
  generatedCode: string;
  explanation: string;
  sawCompleteEvent: boolean;
  streamErrorState: { message: string; statusCode?: number; code?: string } | null;
  shouldAbort: boolean;
}

export function useChatStreamParser(deps: ChatStreamParserDeps) {
  const {
    setGenerationProgress,
    addChatMessage,
    setConversationContext,
    setQuotaErrorText,
    setShowQuotaDialog,
    setActiveTab,
  } = deps;

  const parseStream = useCallback(
    async (
      reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    ): Promise<ChatStreamResult> => {
      let generatedCode = '';
      let explanation = '';
      let sawCompleteEvent = false;
      let streamErrorState: { message: string; statusCode?: number; code?: string } | null = null;

      if (!reader) {
        return { generatedCode, explanation, sawCompleteEvent, streamErrorState, shouldAbort: false };
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');

        // Keep the last line in buffer if it's incomplete
        buffer = lines.pop() || '';

        // Accumulate stream text across all stream events in this chunk,
        // then flush once via setGenerationProgress to avoid excessive re-renders.
        let accumulatedStreamText = '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'status') {
                const msg = typeof data.message === 'string' ? data.message : '';
                setGenerationProgress(prev => {
                  const updatedTodo = updateTodoFromStatus(prev.todoList, msg, prev.isStreaming, prev.files.length);
                  const pct = computeEstimatedPercent(prev.files.length, Boolean(prev.currentFile), prev.isStreaming, false);
                  return { ...prev, status: msg, todoList: updatedTodo, estimatedPercent: pct };
                });
              } else if (data.type === 'thinking') {
                setGenerationProgress(prev => ({
                  ...prev,
                  isThinking: true,
                  thinkingText: (prev.thinkingText || '') + data.text
                }));
              } else if (data.type === 'thinking_complete') {
                setGenerationProgress(prev => ({
                  ...prev,
                  isThinking: false,
                  thinkingDuration: data.duration
                }));
              } else if (data.type === 'conversation') {
                // Add conversational text to chat only if it's not code
                let text = data.text || '';

                // Remove package tags from the text
                text = text.replace(/<package>[^<]*<\/package>/g, '');
                text = text.replace(/<packages>[^<]*<\/packages>/g, '');

                // Filter out any text that contains file XML markers (should not happen for conversation events)
                if (!text.includes('<file') && text.trim().length > 0) {
                  addChatMessage(text.trim(), 'ai');
                }
              } else if (data.type === 'stream' && data.raw) {
                accumulatedStreamText += typeof data.text === 'string' ? data.text : '';
              } else if (data.type === 'app') {
                setGenerationProgress(prev => ({
                  ...prev,
                  status: 'Generated App.jsx structure'
                }));
              } else if (data.type === 'component') {
                setGenerationProgress(prev => ({
                  ...prev,
                  status: `Generated ${data.name}`,
                  components: [...prev.components, {
                    name: data.name,
                    path: data.path,
                    completed: true
                  }],
                  currentComponent: data.index
                }));
              } else if (data.type === 'package') {
                // Handle package installation from tool calls
                setGenerationProgress(prev => ({
                  ...prev,
                  status: data.message || `Installing ${data.name}`
                }));
              } else if (data.type === 'complete') {
                sawCompleteEvent = true;
                generatedCode = typeof data.generatedCode === 'string' ? data.generatedCode : '';
                explanation = data.explanation;

                if (!generatedCode.trim()) {
                  const emptyCompleteMessage =
                    streamErrorState?.message ||
                    (typeof data.error === 'string' && data.error) ||
                    (typeof data.message === 'string' && data.message) ||
                    'Generation failed before completion.';
                  const classification = classifyGatewayError(
                    streamErrorState?.statusCode,
                    streamErrorState?.code,
                    emptyCompleteMessage
                  );
                  if (classification.showQuotaDialog) {
                    setQuotaErrorText(classification.userMessage);
                    setShowQuotaDialog(true);
                  }
                  addChatMessage(`Error: ${classification.userMessage}`, 'error');
                  setGenerationProgress({
                    isGenerating: false,
                    status: '',
                    components: [],
                    currentComponent: 0,
                    streamedCode: '',
                    isStreaming: false,
                    isThinking: false,
                    thinkingText: undefined,
                    thinkingDuration: undefined,
                    files: [],
                    currentFile: undefined,
                    lastProcessedPosition: 0,
                    estimatedPercent: 0,
                    todoList: [],
                    questionnaire: null,
                    plan: null,
                    exitPlan: false,
                  });
                  setActiveTab('preview');
                  return { generatedCode, explanation, sawCompleteEvent, streamErrorState, shouldAbort: true };
                }

                // Save the last generated code
                setConversationContext(prev => ({
                  ...prev,
                  lastGeneratedCode: generatedCode
                }));

                // Clear thinking state when generation completes
                setGenerationProgress(prev => ({
                  ...prev,
                  isThinking: false,
                  thinkingText: undefined,
                  thinkingDuration: undefined,
                  estimatedPercent: 95,
                  todoList: markTodoDone(prev.todoList, 'Generating code'),
                }));

                // Store packages to install from tool calls
                if (data.packagesToInstall && data.packagesToInstall.length > 0) {
                  setPendingPackages(data.packagesToInstall);
                }

                // Parse all files from the completed code if not already done
                const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
                const parsedFiles: GenerationFile[] = [];
                let fileMatch;

                while ((fileMatch = fileRegex.exec(data.generatedCode)) !== null) {
                  const filePath = fileMatch[1];
                  const fileContent = fileMatch[2];
                  const fileExt = filePath.split('.').pop() || '';
                  const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                                  fileExt === 'css' ? 'css' :
                                  fileExt === 'json' ? 'json' :
                                  fileExt === 'html' ? 'html' : 'text';

                  parsedFiles.push({
                    path: filePath,
                    content: fileContent.trim(),
                    type: fileType,
                    completed: true
                  });
                }

                setGenerationProgress(prev => ({
                  ...prev,
                  status: `Generated ${parsedFiles.length > 0 ? parsedFiles.length : prev.files.length} file${(parsedFiles.length > 0 ? parsedFiles.length : prev.files.length) !== 1 ? 's' : ''}!`,
                  isGenerating: false,
                  isStreaming: false,
                  isEdit: prev.isEdit,
                  // Keep the files that were already parsed during streaming
                  files: prev.files.length > 0 ? prev.files : parsedFiles
                }));
              } else if (data.type === 'error') {
                const streamErrorMessage =
                  (typeof data.error === 'string' && data.error) ||
                  (typeof data.message === 'string' && data.message) ||
                  'Unknown error';
                const streamStatusCode =
                  typeof data.statusCode === 'number' ? data.statusCode : undefined;
                const streamCode =
                  typeof data.code === 'string' ? data.code : undefined;
                streamErrorState = {
                  message: streamErrorMessage,
                  statusCode: streamStatusCode,
                  code: streamCode
                };
                const classification = classifyGatewayError(streamStatusCode, streamCode, streamErrorMessage);
                if (classification.showQuotaDialog) {
                  setQuotaErrorText(classification.userMessage);
                  setShowQuotaDialog(true);
                }
                addChatMessage(`Error: ${classification.userMessage}`, 'error');
                setGenerationProgress({
                  isGenerating: false,
                  status: '',
                  components: [],
                  currentComponent: 0,
                  streamedCode: '',
                  isStreaming: false,
                  isThinking: false,
                  thinkingText: undefined,
                  thinkingDuration: undefined,
                  files: [],
                  currentFile: undefined,
                  lastProcessedPosition: 0,
                  estimatedPercent: 0,
                  todoList: [],
                    questionnaire: null,
                    plan: null,
                    exitPlan: false,
                });
                setActiveTab('preview');
                return { generatedCode, explanation, sawCompleteEvent, streamErrorState, shouldAbort: true };
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
              addChatMessage('Warning: stream parse error, some data may be missing.', 'system');
            }
          }
        }

        // Flush accumulated stream text once per chunk to avoid excessive re-renders.
        if (accumulatedStreamText) {
          const textToFlush = accumulatedStreamText;
          accumulatedStreamText = '';
          setGenerationProgress(prev => {
            const oldStreamedCode = prev.streamedCode;
            const newStreamedCode = oldStreamedCode + textToFlush;
            const oldLength = oldStreamedCode.length;

            const updatedState: GenerationProgress = {
              ...prev,
              streamedCode: newStreamedCode,
              isStreaming: true,
              isThinking: false,
              status: 'Generating code...',
              todoList: prev.todoList.length > 0
                ? markTodoDone(markTodoDone(prev.todoList, 'Planning'), 'Generating code')
                : [
                    { label: 'Planning', done: true },
                    { label: 'Generating code', done: true },
                    { label: 'Analyzing code', done: false },
                    { label: 'Applying changes', done: false },
                  ],
            };

            const processedFiles = new Set(prev.files.map(f => f.path));

            // Scan the full accumulated code for complete <file> tags.
            // The processedFiles set prevents duplicates, so scanning the entire
            // string is safe and guarantees we never miss files that span chunks.
            const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
            let match;

            while ((match = fileRegex.exec(newStreamedCode)) !== null) {
              const filePath = match[1];
              const fileContent = match[2];

              // Only add if we haven't processed this file yet
              if (!processedFiles.has(filePath)) {
                const fileExt = filePath.split('.').pop() || '';
                const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                                fileExt === 'css' ? 'css' :
                                fileExt === 'json' ? 'json' :
                                fileExt === 'html' ? 'html' : 'text';

                // Check if file already exists
                const existingFileIndex = updatedState.files.findIndex(f => f.path === filePath);

                if (existingFileIndex >= 0) {
                  // Update existing file and mark as edited
                  updatedState.files = [
                    ...updatedState.files.slice(0, existingFileIndex),
                    {
                      ...updatedState.files[existingFileIndex],
                      content: fileContent.trim(),
                      type: fileType,
                      completed: true,
                      edited: true
                    },
                    ...updatedState.files.slice(existingFileIndex + 1)
                  ];
                } else {
                  // Add new file
                  updatedState.files = [...updatedState.files, {
                    path: filePath,
                    content: fileContent.trim(),
                    type: fileType,
                    completed: true,
                    edited: false
                  }];
                }

                // Keep generic status; don't show per-file names in UI
                if (!prev.isEdit) {
                  updatedState.status = 'Generating code...';
                }
                processedFiles.add(filePath);
              }
            }

            // Check for current file being generated (incomplete file at the end)
            // Only scan the tail of the new text to avoid O(n) match on huge strings.
            const tailText = newStreamedCode.slice(-2000);
            const lastFileMatch = tailText.match(/<file path="([^"]+)">([^]*?)$/);
            if (lastFileMatch && !lastFileMatch[0].includes('</file>')) {
              const filePath = lastFileMatch[1];
              const partialContent = lastFileMatch[2];

              if (!processedFiles.has(filePath)) {
                const fileExt = filePath.split('.').pop() || '';
                const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                                fileExt === 'css' ? 'css' :
                                fileExt === 'json' ? 'json' :
                                fileExt === 'html' ? 'html' : 'text';

                updatedState.currentFile = {
                  path: filePath,
                  content: partialContent,
                  type: fileType
                };
                // Keep generic status; don't show per-file names in UI
                if (!prev.isEdit) {
                  updatedState.status = 'Generating code...';
                }
              }
            } else {
              updatedState.currentFile = undefined;
            }

            updatedState.estimatedPercent = computeEstimatedPercent(
              updatedState.files.length,
              Boolean(updatedState.currentFile),
              updatedState.isStreaming,
              false
            );

            return updatedState;
          });
        }
      }

      // Process any trailing SSE line left in the buffer (common when stream closes
      // without a final newline), otherwise the last error event can be dropped.
      const trailing = buffer.trim();
      if (trailing.startsWith('data: ')) {
        try {
          const data = JSON.parse(trailing.slice(6));
          if (data.type === 'error') {
            const streamErrorMessage =
              (typeof data.error === 'string' && data.error) ||
              (typeof data.message === 'string' && data.message) ||
              'Unknown error';
            const streamStatusCode =
              typeof data.statusCode === 'number' ? data.statusCode : undefined;
            const streamCode =
              typeof data.code === 'string' ? data.code : undefined;
            streamErrorState = {
              message: streamErrorMessage,
              statusCode: streamStatusCode,
              code: streamCode
            };
          } else if (data.type === 'complete') {
            sawCompleteEvent = true;
          }
        } catch (e) {
          console.error('Failed to parse trailing SSE data:', e);
          addChatMessage('Warning: stream trailing data parse error, some data may be missing.', 'system');
        }
      }

      return { generatedCode, explanation, sawCompleteEvent, streamErrorState, shouldAbort: false };
    },
    [
      setGenerationProgress,
      addChatMessage,
      setConversationContext,
      setQuotaErrorText,
      setShowQuotaDialog,
      setActiveTab,
    ]
  );

  return parseStream;
}
