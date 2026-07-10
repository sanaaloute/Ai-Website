"use client";

import { useCallback, useRef, useState } from "react";
import { chatStream } from "@/lib/api/client";

export interface ChatStreamMessage {
  role: "user" | "assistant";
  content: string;
}

export function useChatStream() {
  const [streaming, setStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const sendChat = useCallback(
    async (
      prompt: string,
      onChunk?: (text: string) => void,
      options?: { provider?: string }
    ): Promise<{ text: string; error?: string }> => {
      setStreaming(true);
      setStreamedText("");
      abortRef.current = new AbortController();

      try {
        const response = await chatStream(
          {
            provider: options?.provider ?? 'ai-website',
            prompt,
          },
          abortRef.current.signal
        );

        if (!response.ok || !response.body) {
          const err = `Chat request failed (${response.status})`;
          setStreaming(false);
          return { text: "", error: err };
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data) as { content?: string };
              if (parsed.content) {
                fullText += parsed.content;
                setStreamedText(fullText);
                onChunk?.(fullText);
              }
            } catch {
              // Ignore malformed SSE lines
            }
          }
        }

        setStreaming(false);
        return { text: fullText };
      } catch (err) {
        setStreaming(false);
        const message = err instanceof Error ? err.message : "Chat stream failed";
        return { text: "", error: message };
      }
    },
    []
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  return { streaming, streamedText, sendChat, abort };
}
