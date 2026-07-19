import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { DatabaseConnectionValue } from '@/components/builder/GenerationDialogs';
import type { StoredChatMessageV1 } from '@/lib/generation/storedChatTypes';

const CHAT_MESSAGES_KEY_PREFIX = 'ai-website:chatMessages:';
// Keep persistence bounded so long sessions don't hit the sessionStorage quota.
const MAX_PERSISTED_CHAT_MESSAGES = 100;

function readPersistedChatMessages(sandboxId: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(CHAT_MESSAGES_KEY_PREFIX + sandboxId);
    if (!raw) return [];
    const rows = JSON.parse(raw) as StoredChatMessageV1[];
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((r) => r && (r.type === 'user' || r.type === 'ai') && typeof r.content === 'string')
      .map((r) => ({
        content: r.content,
        type: r.type as ChatMessage['type'],
        timestamp: new Date(r.timestamp),
        metadata: r.metadata as ChatMessage['metadata'] | undefined,
      }));
  } catch {
    return [];
  }
}

function persistChatMessages(sandboxId: string, messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  // Only settled user/ai messages are worth restoring; transient system /
  // command / streaming messages are skipped (mirrors the cloud snapshot
  // filtering in useCloudPersistence).
  const rows: StoredChatMessageV1[] = messages
    .filter((m) => m.type === 'user' || m.type === 'ai')
    .slice(-MAX_PERSISTED_CHAT_MESSAGES)
    .map((m) => ({
      content: m.content,
      type: m.type,
      timestamp: m.timestamp.getTime(),
      metadata: m.metadata as Record<string, unknown> | undefined,
    }));
  if (rows.length === 0) return;
  try {
    window.sessionStorage.setItem(CHAT_MESSAGES_KEY_PREFIX + sandboxId, JSON.stringify(rows));
  } catch {
    // ignore (private mode / quota exceeded)
  }
}

export interface ChatMessage {
  content: string;
  type: 'user' | 'ai' | 'system' | 'file-update' | 'command' | 'error';
  timestamp: Date;
  metadata?: {
    hidden?: boolean;
    scrapedUrl?: string;
    scrapedContent?: unknown;
    generatedCode?: string;
    appliedFiles?: string[];
    commandType?: 'input' | 'output' | 'error' | 'success';
    suggestions?: string[];
    brandingData?: {
      colorScheme?: string;
      colors?: Record<string, string>;
      typography?: {
        fontFamilies?: Record<string, string>;
        fontSizes?: Record<string, string>;
        fontWeights?: Record<string, string>;
        lineHeights?: Record<string, string>;
      };
      spacing?: Record<string, string>;
      borderRadius?: Record<string, string>;
      shadows?: Record<string, string>;
      buttonStyles?: Record<string, string>;
      components?: {
        buttonPrimary?: {
          background?: string;
          textColor?: string;
          borderRadius?: string;
          shadow?: string;
        };
        buttonSecondary?: {
          background?: string;
          textColor?: string;
          borderRadius?: string;
          shadow?: string;
        };
      };
      personality?: {
        tone?: string;
        voice?: string;
        energy?: string;
        targetAudience?: string;
      };
      [key: string]: unknown;
    };
    sourceUrl?: string;
  };
}

export interface ConversationContext {
  scrapedWebsites: Array<{ url: string; content: unknown; timestamp: Date }>;
  generatedComponents: Array<{ name: string; path: string; content: string }>;
  appliedCode: Array<{ files: string[]; timestamp: Date }>;
  currentProject: string;
  siteTitle: string;
  lastGeneratedCode?: string;
  databaseConnection?: DatabaseConnectionValue | null;
}

export function useWorkspaceChat(sandboxId?: string | null) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    // Page-refresh recovery: the sandbox attach flow restores files from the
    // ?sandbox= URL param; restore the matching chat from sessionStorage too.
    if (typeof window === 'undefined') return [];
    try {
      const sandboxFromUrl = new URLSearchParams(window.location.search).get('sandbox');
      return sandboxFromUrl ? readPersistedChatMessages(sandboxFromUrl) : [];
    } catch {
      return [];
    }
  });
  const [aiChatInput, setAiChatInput] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    scrapedWebsites: [],
    generatedComponents: [],
    appliedCode: [],
    currentProject: '',
    siteTitle: '',
    lastGeneratedCode: undefined,
    databaseConnection: null,
  });

  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Restore persisted chat once per sandbox (page-refresh recovery). Keyed by
  // sandboxId so a brand-new sandbox (no stored rows) keeps its fresh state,
  // which makes createSandbox's setChatMessages([]) wipe harmless: a new
  // sandbox simply has nothing to restore.
  const chatRestoredForSandboxRef = useRef<string | null>(null);
  useEffect(() => {
    if (!sandboxId) return;
    if (chatRestoredForSandboxRef.current === sandboxId) return;
    chatRestoredForSandboxRef.current = sandboxId;
    // Deferred so the restore doesn't synchronously cascade renders from the
    // effect body (react-hooks/set-state-in-effect).
    const timer = window.setTimeout(() => {
      const restored = readPersistedChatMessages(sandboxId);
      if (restored.length === 0) return;
      setChatMessages((prev) => {
        // Never clobber a conversation that's already underway.
        if (prev.some((m) => m.type === 'user' || m.type === 'ai')) return prev;
        // Keep any system messages added while the sandbox was attaching.
        return [...restored, ...prev];
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [sandboxId]);

  // Persist chat per sandbox (debounced) so a refresh can restore it.
  const persistStateRef = useRef<{ sandboxId: string | null; messages: ChatMessage[] }>({
    sandboxId: null,
    messages: [],
  });
  useEffect(() => {
    if (!sandboxId) return;
    persistStateRef.current = { sandboxId, messages: chatMessages };
    const timer = window.setTimeout(() => {
      persistChatMessages(sandboxId, chatMessages);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [chatMessages, sandboxId]);

  // Flush on unmount so a refresh inside the debounce window doesn't lose the
  // latest message.
  useEffect(() => {
    return () => {
      const { sandboxId: sid, messages } = persistStateRef.current;
      if (sid) persistChatMessages(sid, messages);
    };
  }, []);

  const addChatMessage = useCallback(
    (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => {
      setChatMessages((prev) => {
        if (type === 'system' && prev.length > 0) {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage.type === 'system' && lastMessage.content === content) {
            return prev;
          }
        }
        return [...prev, { content, type, timestamp: new Date(), metadata }];
      });
    },
    []
  );

  const mainChatVisibleMessages = useMemo(
    () =>
      chatMessages.filter((m) => {
        if (m.metadata?.hidden) return false;
        // Show user and AI messages
        if (m.type === 'user' || m.type === 'ai') return true;
        // Show system messages (status, success, warnings)
        // Transient messages like "Thinking..." are removed by the caller before they reach here
        if (m.type === 'system') return true;
        // Show error messages so users know when something went wrong
        if (m.type === 'error') return true;
        // Hide command output to reduce noise
        return false;
      }),
    [chatMessages]
  );

  return {
    // State
    chatMessages,
    setChatMessages,
    aiChatInput,
    setAiChatInput,
    promptInput,
    setPromptInput,
    conversationContext,
    setConversationContext,
    mainChatVisibleMessages,
    // Refs
    chatMessagesRef,
    // Actions
    addChatMessage,
  };
}
