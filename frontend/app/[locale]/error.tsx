'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error so it is visible in the browser console.
    console.error('[LocaleError]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h2 className="text-2xl font-semibold text-white">Something went wrong</h2>
      <p className="mt-2 max-w-md text-zinc-400">
        We could not load this page. You can try again or go back home.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-gradient-to-r from-primary via-primary-soft to-primary-accent px-4 py-2 text-sm font-semibold text-white shadow-soft-glow transition hover:opacity-95"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-white/15 bg-background-soft/80 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-glow-cyan/70 hover:text-white"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
