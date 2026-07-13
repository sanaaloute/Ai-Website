'use client';

import React, { memo } from 'react';
import { Link } from '@/i18n/navigation';
import BuilderChatInput from '@/components/builder/BuilderChatInput';
import CodeApplicationProgress from '@/components/CodeApplicationProgress';
import type { CodeApplicationState, GenerationProgress } from '@/hooks/useGenerationProgress';
import type { ChatMessage, ConversationContext } from '@/hooks/useWorkspaceChat';
import { ScrapedWebsitesPanel } from './ScrapedWebsitesPanel';
import { ChatMessageItem } from './ChatMessageItem';
import { GenerationProgressPanel } from './GenerationProgressPanel';
import { AgentStreamCards } from './AgentStreamCards';
import { AgentQuestionnaire } from './AgentQuestionnaire';
import { Square } from 'lucide-react';

export interface ChatSidebarWorkspace {
  conversationContext: ConversationContext;
  screenshotCollapsed: boolean;
  setScreenshotCollapsed: (collapsed: boolean) => void;
  mainChatVisibleMessages: ChatMessage[];
  chatMessagesRef: React.RefObject<HTMLDivElement>;
  codeApplicationState: CodeApplicationState;
  generationProgress: GenerationProgress;
  generationEstimatedPercent: number;
  aiChatInput: string;
  setAiChatInput: (value: string) => void;
  sendChatMessage: () => Promise<void>;
  abortChatMessage?: () => void;
  loading: boolean;
  generationChatInputRef: React.RefObject<HTMLTextAreaElement>;
}

interface GenerationChatSidebarProps {
  workspace: ChatSidebarWorkspace;
  width?: number;
}

function GenerationChatSidebarComponent({ workspace, width = 384 }: GenerationChatSidebarProps) {
  const {
    conversationContext,
    screenshotCollapsed,
    setScreenshotCollapsed,
    mainChatVisibleMessages,
    chatMessagesRef,
    codeApplicationState,
    generationProgress,
    generationEstimatedPercent,
    aiChatInput,
    setAiChatInput,
    sendChatMessage,
    abortChatMessage,
    loading,
    generationChatInputRef,
  } = workspace;

  return (
    <div
      className="relative flex min-h-0 flex-shrink-0 flex-col border-r border-white/[0.06] bg-black/30 backdrop-blur-xl"
      style={{ width }}
    >
      {/* Futuristic left edge glow */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-primary-accent/30 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute -right-2 top-0 h-24 w-6 bg-primary-accent/10 blur-xl" aria-hidden />

      {/* Sidebar header */}
      <div className="shrink-0 border-b border-white/[0.06] bg-black/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glow-cyan opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-glow-cyan shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-zinc-300">AI Chat</span>
        </div>
        <div className="flex items-center gap-2">
          {generationProgress.isGenerating && abortChatMessage && (
            <button
              type="button"
              onClick={() => abortChatMessage()}
              className="inline-flex items-center gap-1 rounded-md border border-red-400/20 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-300 transition hover:border-red-400/40 hover:bg-red-500/20"
              title="Stop the current generation"
            >
              <Square className="h-2.5 w-2.5 fill-current" />
              Stop
            </button>
          )}
          <Link
            href="/"
            className="text-xs text-zinc-600 transition hover:text-glow-cyan"
          >
            ← Back
          </Link>
        </div>
      </div>

      <ScrapedWebsitesPanel
        scrapedWebsites={conversationContext.scrapedWebsites}
        screenshotCollapsed={screenshotCollapsed}
        setScreenshotCollapsed={setScreenshotCollapsed}
      />

      <div
        className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-3 scrollbar-hide"
        ref={chatMessagesRef}
      >
        {mainChatVisibleMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-[0_0_20px_rgba(124,58,237,0.15)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-glow-cyan">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className="text-xs text-zinc-500 max-w-[200px]">
              Start building something amazing
            </p>
          </div>
        )}
        {mainChatVisibleMessages.map((msg, idx) => (
          <ChatMessageItem
            key={idx}
            msg={msg}
            onSuggestionClick={(suggestion) => {
              setAiChatInput(suggestion);
              void sendChatMessage();
            }}
          />
        ))}

        {/* Code application progress */}
        {codeApplicationState.stage && (
          <CodeApplicationProgress state={codeApplicationState} />
        )}

        {/* File generation progress - inline display (during generation) */}
        {generationProgress.agentSteps && generationProgress.agentSteps.length > 0 ? (
          <AgentStreamCards
            generationProgress={generationProgress}
            generationEstimatedPercent={generationEstimatedPercent}
          />
        ) : (
          <GenerationProgressPanel
            generationProgress={generationProgress}
            generationEstimatedPercent={generationEstimatedPercent}
          />
        )}

        {/* Planning Questionnaire */}
        {generationProgress.questionnaire && (
          <AgentQuestionnaire
            questions={generationProgress.questionnaire.questions}
            onSubmit={(answers) => {
              const answerText = Object.entries(answers)
                .map(([id, answer]) => {
                  const q = generationProgress.questionnaire!.questions.find(
                    (qq) => qq.id === id
                  );
                  return q ? `**${q.question}**\n${answer}` : `${id}: ${answer}`;
                })
                .join('\n\n');
              setAiChatInput(answerText);
              void sendChatMessage();
            }}
          />
        )}
      </div>

      <div className="shrink-0 border-t border-white/[0.06] bg-black/40 p-3 backdrop-blur-md">
        <BuilderChatInput
          ref={generationChatInputRef}
          value={aiChatInput}
          onChange={setAiChatInput}
          onSubmit={() => void sendChatMessage()}
          placeholder="Tell me what you want..."
          disabled={loading || generationProgress.isGenerating}
        />
      </div>
    </div>
  );
}

export default memo(GenerationChatSidebarComponent);
