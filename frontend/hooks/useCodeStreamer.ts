import { useCallback } from 'react';
import type { ApplyPipelineState, CodeApplicationState } from '@/hooks/useGenerationProgress';
import type { ChatMessage } from '@/hooks/useWorkspaceChat';

export interface CodeStreamerDeps {
  transitionApplyPipelineState: (next: ApplyPipelineState, reason: string) => boolean;
  setCodeApplicationState: React.Dispatch<React.SetStateAction<CodeApplicationState>>;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
}

export function useCodeStreamer(deps: CodeStreamerDeps) {
  const { transitionApplyPipelineState, setCodeApplicationState, addChatMessage } = deps;

  const streamCode = useCallback(
    async (
      reader: ReadableStreamDefaultReader<Uint8Array>,
      applyDeadlineAt?: number
    ): Promise<{ finalData: unknown; lastProgressAt: number }> => {
      const decoder = new TextDecoder();
      let finalData: unknown = null;
      let lastProgressAt = Date.now();
      let shouldStopStream = false;
      let streamFatalError: Error | null = null;
      const APPLY_IDLE_TIMEOUT_MS = 90 * 1000;

      const readChunkWithTimeout = async () => {
        return await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error('Apply stream stalled (no progress updates for 90s).'));
            }, APPLY_IDLE_TIMEOUT_MS);
          }),
        ]);
      };

      while (true) {
        const { done, value } = await readChunkWithTimeout();
        if (done) break;
        lastProgressAt = Date.now();

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              lastProgressAt = Date.now();

              switch (data.type) {
                case 'heartbeat':
                  // Keepalive event from backend stream. No UI message needed.
                  break;

                case 'start':
                  // Don't add as chat message, just update state
                  transitionApplyPipelineState('streaming', 'received stream start');
                  setCodeApplicationState((prev) => ({
                    ...prev,
                    stage: 'analyzing',
                    message: data.message || 'Starting code application...',
                    deadlineAt: prev.deadlineAt || applyDeadlineAt
                  }));
                  break;

                case 'step':
                  // Update progress state based on step
                  if (data.message.includes('Installing') && data.packages) {
                    setCodeApplicationState((prev) => ({
                      ...prev,
                      stage: 'installing',
                      packages: data.packages,
                      message: data.message,
                      deadlineAt: prev.deadlineAt || applyDeadlineAt
                    }));
                  } else if (data.message.includes('Creating files') || data.message.includes('Applying')) {
                    setCodeApplicationState((prev) => ({
                      ...prev,
                      stage: 'applying',
                      filesGenerated: prev.filesGenerated || [],
                      message: data.message,
                      deadlineAt: prev.deadlineAt || applyDeadlineAt
                    }));
                  } else if (data.message.includes('Analyzing')) {
                    setCodeApplicationState(prev => ({
                      ...prev,
                      stage: 'analyzing',
                      message: data.message,
                      deadlineAt: prev.deadlineAt || applyDeadlineAt
                    }));
                  }
                  break;

                case 'package-progress':
                  // Handle package installation progress
                  if (data.installedPackages) {
                    setCodeApplicationState(prev => ({
                      ...prev,
                      installedPackages: data.installedPackages
                    }));
                  }
                  break;

                case 'command':
                  // Don't show npm install commands - they're handled by info messages
                  if (data.command && !data.command.includes('npm install')) {
                    addChatMessage(data.command, 'command', { commandType: 'input' });
                  }
                  break;

                case 'success':
                  if (data.installedPackages) {
                    setCodeApplicationState(prev => ({
                      ...prev,
                      installedPackages: data.installedPackages
                    }));
                  }
                  break;

                case 'file-progress':
                  setCodeApplicationState(prev => ({
                    ...prev,
                    stage: 'applying',
                    currentFile: data.fileName || prev.currentFile,
                    message: 'Applying to sandbox...',
                    filesGenerated: data.fileName
                      ? Array.from(new Set([...(prev.filesGenerated || []), data.fileName]))
                      : prev.filesGenerated,
                    deadlineAt: prev.deadlineAt || applyDeadlineAt
                  }));
                  break;

                case 'file-complete':
                  setCodeApplicationState(prev => ({
                    ...prev,
                    stage: 'applying',
                    currentFile: data.fileName || prev.currentFile,
                    message: 'Applying to sandbox...',
                    filesGenerated: data.fileName
                      ? Array.from(new Set([...(prev.filesGenerated || []), data.fileName]))
                      : prev.filesGenerated,
                    deadlineAt: prev.deadlineAt || applyDeadlineAt
                  }));
                  break;

                case 'command-progress':
                  addChatMessage(`${data.action} command: ${data.command}`, 'command', { commandType: 'input' });
                  break;

                case 'command-output':
                  addChatMessage(data.output, 'command', {
                    commandType: data.stream === 'stderr' ? 'error' : 'output'
                  });
                  break;

                case 'command-complete':
                  if (data.success) {
                    addChatMessage(`Command completed successfully`, 'system');
                  } else {
                    addChatMessage(`Command failed with exit code ${data.exitCode}`, 'system');
                  }
                  break;

                case 'complete':
                  finalData = data;
                  shouldStopStream = true;
                  break;

                case 'sandbox_gone':
                  streamFatalError = new Error(
                    data.message || 'Preview sandbox is no longer available. Starting a new environment…'
                  );
                  shouldStopStream = true;
                  break;

                case 'error':
                  if (data.error === 'SANDBOX_GONE' || data.code === 'SANDBOX_GONE') {
                    streamFatalError = new Error(
                      'Preview sandbox expired. Creating a new one — you can resend your last prompt if needed.'
                    );
                    shouldStopStream = true;
                    break;
                  }
                  streamFatalError = new Error(data.message || data.error || 'Unknown error');
                  shouldStopStream = true;
                  break;

                case 'warning':
                  addChatMessage(`${data.message}`, 'system');
                  setCodeApplicationState(prev => prev.stage ? ({
                    ...prev,
                    message: data.message || prev.message,
                    deadlineAt: prev.deadlineAt || applyDeadlineAt
                  }) : prev);
                  break;

                case 'info':
                  // Show info messages, especially for package installation
                  if (data.message) {
                    addChatMessage(data.message, 'system');
                    setCodeApplicationState(prev => prev.stage ? ({
                      ...prev,
                      stage: data.message.includes('Analyz') ? 'analyzing' : prev.stage,
                      message: data.message,
                      currentFile: typeof data.fileName === 'string' ? data.fileName : prev.currentFile,
                      deadlineAt: prev.deadlineAt || applyDeadlineAt
                    }) : prev);
                  }
                  break;
              }
            } catch (e) {
              console.error('[codeStreamer] Parse error in apply stream chunk:', e);
              addChatMessage('Warning: apply stream parse error, some progress data may be missing.', 'system');
            }
          }
        }
        if (shouldStopStream) {
          break;
        }
      }
      if (streamFatalError) {
        throw streamFatalError;
      }

      return { finalData, lastProgressAt };
    },
    [transitionApplyPipelineState, setCodeApplicationState, addChatMessage]
  );

  return { streamCode };
}
