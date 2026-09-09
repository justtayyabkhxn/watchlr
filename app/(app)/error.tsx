"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PlugZap, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Failures inside the app shell.
 *
 * The root `app/error.tsx` replaces the entire document — navbar included —
 * which for a page whose TMDB call timed out is a heavier response than the
 * problem deserves: the rest of the app still works, and the user should be
 * able to click straight into it. This boundary renders *inside* the app
 * layout, so the nav stays put and the retry is one button away.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Digest is the only handle on the server-side stack in production.
    console.error("[watchlr] route failed:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-6 text-center">
      <div>
        <span
          aria-hidden
          className="inline-grid size-16 -rotate-6 animate-float place-items-center rounded-3xl border-2 border-ink bg-accent-soft shadow-offset"
        >
          <PlugZap className="size-7" strokeWidth={2.25} />
        </span>
        <p className="overline-track mt-6 text-accent">that didn&apos;t load</p>
        <h1 className="text-offset mt-2 text-3xl font-black tracking-tight">
          the page gave up halfway.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          usually the movie database timing out, and usually gone by the second
          try. everything else still works.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>
            <RotateCcw className="size-4" aria-hidden /> try again
          </Button>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full border-2 border-ink bg-card px-6 text-sm font-bold shadow-offset-sm transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-surface-hover hover:shadow-offset active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            go home
          </Link>
        </div>
      </div>
    </div>
  );
}
