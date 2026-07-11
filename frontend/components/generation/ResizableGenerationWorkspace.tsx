'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

const MIN_CHAT_WIDTH = 280;
const MAX_CHAT_WIDTH = 720;
const DEFAULT_CHAT_WIDTH = 384;
const STORAGE_KEY = 'ai-website:generation:chatWidth';

interface ResizableGenerationWorkspaceProps {
  renderChatSidebar: (width: number) => React.ReactNode;
  rightPanel: React.ReactNode;
}

export function ResizableGenerationWorkspace({
  renderChatSidebar,
  rightPanel,
}: ResizableGenerationWorkspaceProps) {
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(DEFAULT_CHAT_WIDTH);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!Number.isNaN(parsed)) {
          setChatWidth(Math.max(MIN_CHAT_WIDTH, Math.min(MAX_CHAT_WIDTH, parsed)));
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = chatWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, [chatWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientX - dragStartXRef.current;
      const newWidth = Math.max(
        MIN_CHAT_WIDTH,
        Math.min(MAX_CHAT_WIDTH, dragStartWidthRef.current + delta)
      );
      setChatWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_KEY, String(chatWidth));
        } catch {
          // ignore storage errors
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [chatWidth]);

  return (
    <div className="relative z-0 flex min-h-0 flex-1 overflow-hidden">
      {renderChatSidebar(chatWidth)}

      {/* Draggable resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="group relative z-20 flex w-3 flex-shrink-0 cursor-col-resize items-center justify-center bg-transparent"
        style={{ cursor: 'col-resize' }}
        aria-label="Resize chat panel"
        role="separator"
      >
        <div className="h-16 w-[2px] rounded-full bg-white/10 transition-all group-hover:h-24 group-hover:bg-primary-accent/60 group-active:h-28 group-active:bg-primary-accent" />
        {/* Hover glow line */}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary-accent/0 to-transparent transition-all group-hover:via-primary-accent/30" aria-hidden />
      </div>

      {rightPanel}
    </div>
  );
}
