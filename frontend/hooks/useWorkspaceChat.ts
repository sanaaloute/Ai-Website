import { useState, useRef, useCallback, useMemo } from 'react';
import type { DatabaseConnectionValue } from '@/components/builder/GenerationDialogs';

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

export function useWorkspaceChat() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
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
