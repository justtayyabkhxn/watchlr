"use client";

import { PlugZap, RotateCcw } from "lucide-react";
import { Button } from "./Button";

/*
 * The state every fetch in this app needs and half of them were missing.
 *
 * The bug this exists to kill: `isLoading || !data ? <skeleton/> : <content/>`
 * looks complete but has no branch for failure — a query that errors leaves
 * `data` undefined with `isLoading` false, so the skeleton and its rotating
 * loading copy play forever and the user waits for something that already
 * gave up. A wait that can't end is worse than an error.
 *
 * So: say it failed, say it in the house voice, and always offer the retry.
 * `onRetry` takes react-query's `refetch` directly — it returns a promise, so
 * `Button` shows its own pending dots for the duration.
 */
export function QueryError({
  what = "that",
  error,
  onRetry,
  compact = false,
}: {
  /** What didn't load, dropped into the sentence: "your stats didn't load". */
  what?: string;
  error?: unknown;
  onRetry?: () => unknown;
  /** Inline single-line version, for panels too small for the card. */
  compact?: boolean;
}) {
  const detail =
    error instanceof Error && error.message && error.message.length < 120
      ? error.message
      : "";

  if (compact) {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card px-4 py-3"
      >
        <PlugZap className="size-4 shrink-0 text-accent" aria-hidden />
        <p className="min-w-0 flex-1 text-sm font-bold text-muted">
          {what} didn&apos;t load.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={() => void onRetry()}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-card px-3 py-1 text-xs font-bold shadow-offset-xs transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-accent-soft hover:shadow-offset-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <RotateCcw className="size-3" aria-hidden />
            retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex flex-col items-center rounded-3xl border-2 border-dashed border-border bg-card px-6 py-12 text-center"
    >
      <span className="grid size-14 -rotate-6 place-items-center rounded-2xl border-2 border-ink bg-accent-soft shadow-offset-xs">
        <PlugZap className="size-6" strokeWidth={2.25} aria-hidden />
      </span>
      <h3 className="mt-5 text-xl font-black">{what} didn&apos;t load</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        {detail || "the connection dropped somewhere between here and the server."} one
        more go usually sorts it.
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-6" onClick={() => onRetry()}>
          <RotateCcw className="size-4" aria-hidden /> try again
        </Button>
      )}
    </div>
  );
}
