'use client';

import type { ChatMessage } from '@/hooks/useWorkspaceChat';
import { BrandingDataCard } from './BrandingDataCard';
import { Wand2, User, Bot, Terminal, AlertCircle } from 'lucide-react';

interface ChatMessageItemProps {
  msg: ChatMessage;
  onSuggestionClick?: (suggestion: string) => void;
}

export function ChatMessageItem({ msg, onSuggestionClick }: ChatMessageItemProps) {
  const hasSuggestions = msg.metadata?.suggestions && msg.metadata.suggestions.length > 0;

  const avatarColors = {
    user: 'from-zinc-600 to-zinc-700',
    ai: 'from-glow-purple/60 to-glow-cyan/60',
    system: 'from-glow-cyan/60 to-emerald-500/60',
    command: 'from-zinc-700 to-zinc-800',
    error: 'from-red-600/80 to-red-700/80',
  };

  const avatarIcons = {
    user: <User className="h-3 w-3 text-white/80" />,
    ai: <Bot className="h-3 w-3 text-white/80" />,
    system: <AlertCircle className="h-3 w-3 text-white/80" />,
    command: <Terminal className="h-3 w-3 text-white/80" />,
    error: <AlertCircle className="h-3 w-3 text-white/80" />,
  };

  return (
    <div className="block">
      <div className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`flex w-full flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}
        >
          {/* Avatar row */}
          <div className="flex items-center gap-1.5 mb-1">
            {msg.type !== 'user' && (
              <div className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${avatarColors[msg.type as keyof typeof avatarColors] || avatarColors.system}`}>
                {avatarIcons[msg.type as keyof typeof avatarIcons] || avatarIcons.system}
              </div>
            )}
            <span className="text-[10px] text-zinc-600 font-medium">
              {msg.type === 'user' ? 'You' : msg.type === 'ai' ? 'AI' : msg.type === 'system' ? 'System' : msg.type === 'command' ? 'Command' : 'Error'}
            </span>
          </div>

          <div
            className={`inline-block max-w-[92%] rounded-2xl border px-3.5 py-2.5 shadow-lg backdrop-blur-sm ${
              msg.type === 'user'
                ? 'ml-auto border-white/10 bg-gradient-to-br from-primary/25 via-primary-soft/15 to-background-soft text-zinc-100 shadow-[0_0_30px_rgba(124,58,237,0.12)]'
                : msg.type === 'ai'
                  ? 'mr-auto border-white/[0.06] bg-white/[0.04] text-zinc-200'
                  : msg.type === 'system'
                    ? 'border-glow-cyan/15 bg-glow-cyan/[0.05] text-xs text-zinc-300'
                    : msg.type === 'command'
                      ? 'border-white/[0.06] bg-zinc-900/60 font-mono text-xs text-zinc-300'
                      : msg.type === 'error'
                        ? 'border-red-500/25 bg-red-950/60 text-xs text-red-100'
                        : 'border-white/[0.06] bg-white/[0.04] text-xs text-zinc-300'
            }`}
          >
            {msg.type === 'command' ? (
              <div className="flex items-start gap-2">
                <span
                  className={`text-[10px] ${
                    msg.metadata?.commandType === 'input'
                      ? 'text-blue-400'
                      : msg.metadata?.commandType === 'error'
                        ? 'text-red-400'
                        : msg.metadata?.commandType === 'success'
                          ? 'text-green-400'
                          : 'text-gray-500'
                  }`}
                >
                  {msg.metadata?.commandType === 'input' ? '$' : '>'}
                </span>
                <span className="flex-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed text-white/90">
                  {msg.content}
                </span>
              </div>
            ) : msg.type === 'error' ? (
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-5 h-5 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-3 h-3 text-red-300" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-medium mb-0.5 text-xs text-red-200">Build Errors Detected</div>
                  <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-xs leading-relaxed text-red-100/80">
                    {msg.content}
                  </div>
                  <div className="mt-1.5 text-[10px] text-red-300/60">
                    Press &apos;F&apos; or click the Fix button above to resolve
                  </div>
                </div>
              </div>
            ) : (
              <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-xs leading-relaxed">
                {msg.content}
              </span>
            )}
          </div>

          {/* Suggestion chips */}
          {hasSuggestions && onSuggestionClick && (
            <div className="mr-auto mt-1.5 max-w-[92%] rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-glow-cyan/80">
                <Wand2 className="h-3 w-3" />
                <span>Suggestions:</span>
              </div>
              <div className="flex flex-col gap-1">
                {msg.metadata!.suggestions!.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSuggestionClick(suggestion)}
                    className="text-left rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-xs leading-relaxed text-zinc-300 transition hover:border-glow-cyan/25 hover:bg-glow-cyan/[0.05] hover:text-white"
                  >
                    <span className="mr-1.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-glow-cyan/15 text-[9px] font-bold text-glow-cyan">
                      {idx + 1}
                    </span>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Show branding data if this is a brand extraction message */}
          {msg.metadata?.brandingData && (
            <BrandingDataCard
              brandingData={msg.metadata.brandingData}
              sourceUrl={msg.metadata.sourceUrl}
            />
          )}
        </div>
      </div>
    </div>
  );
}
