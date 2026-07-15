"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const ease = [0.22, 1, 0.36, 1] as const;

const TYPING_SPEED_MS = 65;
const DELETING_SPEED_MS = 30;
const PAUSE_AFTER_TYPED_MS = 2400;
const PAUSE_AFTER_DELETED_MS = 450;

/**
 * Types and erases each message letter by letter, cycling through the list.
 * Uses code points (not UTF-16 units) so non-Latin scripts are never split.
 */
function useTypewriter(messages: string[]): string {
  const [messageIndex, setMessageIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (messages.length === 0) return;
    const current = messages[messageIndex % messages.length];
    const charCount = Array.from(current).length;

    let delay: number;
    if (!deleting && length >= charCount) {
      delay = PAUSE_AFTER_TYPED_MS;
    } else if (deleting && length === 0) {
      delay = PAUSE_AFTER_DELETED_MS;
    } else {
      delay = deleting ? DELETING_SPEED_MS : TYPING_SPEED_MS;
    }

    const timeout = window.setTimeout(() => {
      if (!deleting && length >= charCount) {
        setDeleting(true);
      } else if (deleting && length === 0) {
        setDeleting(false);
        setMessageIndex((i) => (i + 1) % messages.length);
      } else {
        setLength((l) => l + (deleting ? -1 : 1));
      }
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [messages, messageIndex, length, deleting]);

  if (messages.length === 0) return "";
  return Array.from(messages[messageIndex % messages.length])
    .slice(0, length)
    .join("");
}

export default function HomePageTitle() {
  const t = useTranslations("homePageTitle");
  // `rotating2` was the old subtitle; the headline cycles through the rest.
  const m1 = t("rotating1");
  const m3 = t("rotating3");
  const m4 = t("rotating4");
  const messages = useMemo(() => [m1, m3, m4], [m1, m3, m4]);
  const typed = useTypewriter(messages);

  // Render the longest message invisibly to reserve space, so the subtitle
  // and prompt input never jump while the headline types, wraps, or erases.
  const longest = messages.reduce((a, b) =>
    Array.from(b).length > Array.from(a).length ? b : a
  );

  return (
    <header className="flex w-full flex-col items-center pb-10 text-center sm:pb-12">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        aria-label={m1}
        className="relative max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl"
      >
        <span aria-hidden className="invisible">
          {longest}
        </span>
        <span aria-hidden className="absolute inset-0">
          {typed}
          <span className="animate-pulse font-light text-primary">|</span>
        </span>
      </motion.h1>
    </header>
  );
}
