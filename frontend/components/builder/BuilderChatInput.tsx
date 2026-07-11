"use client";

import { forwardRef, type KeyboardEvent, type MutableRefObject, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Sparkles } from "lucide-react";

export interface BuilderChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

const BuilderChatInput = forwardRef<HTMLTextAreaElement, BuilderChatInputProps>(function BuilderChatInput(
  {
    value,
    onChange,
    onSubmit,
    placeholder = "Tell me what you want...",
    disabled = false
  },
  ref
) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = (node: HTMLTextAreaElement | null) => {
    (innerRef as MutableRefObject<HTMLTextAreaElement | null>).current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      (ref as MutableRefObject<HTMLTextAreaElement | null>).current = node;
    }
  };

  useEffect(() => {
    const el = (innerRef as MutableRefObject<HTMLTextAreaElement | null>).current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) void onSubmit();
    }
  };

  return (
    <div className="relative w-full">
      {/* Animated gradient border */}
      <div className="group relative flex items-end gap-2 rounded-2xl bg-gradient-to-r from-primary/60 via-primary-soft/60 to-primary-accent/60 p-[1px] transition-all focus-within:shadow-[0_0_24px_rgba(124,58,237,0.25)] hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]">
        <div className="flex w-full items-end gap-2 rounded-[15px] bg-black/60 p-2 transition-colors focus-within:bg-black/70">
          <div className="mb-2.5 ml-1 text-primary-accent/70">
            <Sparkles className="h-4 w-4" />
          </div>
          <textarea
            data-testid="generation-prompt-input"
            ref={textareaRef}
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[40px] w-full resize-none bg-transparent px-1 py-2 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-500 outline-none ring-0 disabled:opacity-40"
          />
          <motion.button
            data-testid="generation-generate-button"
            type="button"
            disabled={disabled || !value.trim()}
            whileTap={{ scale: disabled || !value.trim() ? 1 : 0.9 }}
            onClick={() => void onSubmit()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary via-primary-soft to-primary-accent text-white shadow-[0_0_16px_rgba(124,58,237,0.4)] transition hover:shadow-[0_0_24px_rgba(129,140,248,0.6)] disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          </motion.button>
        </div>
      </div>
    </div>
  );
});

export default BuilderChatInput;
