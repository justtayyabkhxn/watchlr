"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RotateCcw, SlidersHorizontal, ThumbsDown, X } from "lucide-react";

/**
 * What the AI currently thinks it's been told, as chips you can delete.
 *
 * This is the difference between a slot machine and a search you can steer:
 * the model's working memory is on screen, and a constraint you remove is
 * gone from the next prompt rather than something you have to argue it out
 * of in prose.
 */
export function ConstraintBar({
  constraints,
  dismissedCount,
  onRemove,
  onReset,
  busy,
}: {
  constraints: string[];
  dismissedCount: number;
  onRemove: (value: string) => void;
  onReset: () => void;
  busy: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const empty = constraints.length === 0;

  return (
    <div className="sticky top-16 z-30 -mx-6 border-b-2 border-border bg-background/95 px-6 py-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2">
        <span className="overline-track inline-flex items-center gap-1.5 text-muted">
          <SlidersHorizontal className="size-3.5" aria-hidden />
          going on
        </span>

        {empty && (
          <span className="text-xs font-bold text-muted">
            nothing locked in yet — tell it what you&apos;re after
          </span>
        )}

        <AnimatePresence initial={false}>
          {constraints.map((c) => (
            <motion.button
              key={c}
              type="button"
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.16 }}
              onClick={() => onRemove(c)}
              title={`Drop "${c}"`}
              aria-label={`Drop the ${c} constraint`}
              className="group inline-flex -rotate-1 items-center gap-1.5 rounded-full border-2 border-ink bg-accent-soft px-3 py-1 text-xs font-black shadow-offset-xs transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:rotate-0 hover:bg-accent hover:shadow-offset-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              {c}
              <X className="size-3 opacity-50 transition-opacity group-hover:opacity-100" aria-hidden />
            </motion.button>
          ))}
        </AnimatePresence>

        {dismissedCount > 0 && (
          <span
            title="Titles you turned down. The AI reads the pattern, not just the names."
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-border px-3 py-1 text-xs font-bold text-muted"
          >
            <ThumbsDown className="size-3" aria-hidden />
            {dismissedCount} turned down
          </span>
        )}

        <button
          type="button"
          onClick={onReset}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-muted transition-colors hover:text-ink disabled:opacity-40"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          start over
        </button>
      </div>
    </div>
  );
}
