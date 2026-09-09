"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bookmark, X } from "lucide-react";
import { Rail } from "@/components/cards/Rail";
import { PosterCard } from "@/components/cards/PosterCard";
import { itemKey, toMediaItem, type SuggestedItem } from "./types";

/**
 * One assistant turn's suggestions.
 *
 * The dismiss button is the load-bearing one. Saving is already handled by
 * the card's own quick actions, but "not that" is the signal that makes a
 * conversation converge instead of circling — it goes back into the next
 * prompt as a pattern to read, not just a title to skip.
 */
export function PickStrip({
  items,
  onDismiss,
}: {
  items: SuggestedItem[];
  onDismiss: (item: SuggestedItem) => void;
}) {
  const reduceMotion = useReducedMotion();
  if (items.length === 0) return null;

  return (
    <Rail label="Suggestions">
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((item) => (
          <motion.div
            key={itemKey(item)}
            layout={!reduceMotion}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="w-40 shrink-0 sm:w-44"
          >
            <PosterCard item={toMediaItem(item)} className="w-full" />

            {item.onShelf && (
              <span className="mt-1.5 inline-flex rotate-1 items-center gap-1 rounded-full border-2 border-ink bg-card px-2 py-0.5 text-[10px] font-black shadow-offset-xs">
                <Bookmark className="size-2.5 fill-ink" aria-hidden />
                on your list
              </span>
            )}

            {item.reason && (
              <p className="mt-1.5 inline-block -rotate-1 rounded-xl bg-accent-soft/70 px-2 py-1 text-[11px] font-bold leading-snug text-ink">
                {item.reason}
              </p>
            )}

            <button
              type="button"
              onClick={() => onDismiss(item)}
              aria-label={`Not ${item.title}`}
              className="mt-1 flex items-center gap-1 text-[11px] font-bold text-muted transition-colors hover:text-accent"
            >
              <X className="size-3" aria-hidden />
              not this
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </Rail>
  );
}
