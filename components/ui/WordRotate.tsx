"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/*
 * A single word that rolls: the outgoing word slides up and out while the
 * incoming one drops in behind it, masked by the container so both appear to
 * travel through a slot.
 *
 * Adapted from the MagicUI WordRotate in three ways that matter here:
 *
 * 1. **Controlled, not self-timed.** The original runs its own interval. The
 *    hero shows three of these at once (ask / headline / reply) and they only
 *    read correctly as a matched set — three independent intervals would drift
 *    apart within seconds. This one rolls when `index` changes; one timer
 *    upstream drives all of them in lockstep.
 *
 * 2. **Inline, not block.** The original renders a `<div>` wrapping an `<h1>`,
 *    which can't sit mid-sentence ("okay but what about the ___?") and would
 *    nest a second h1 inside the hero's real one. This is an inline-flex span.
 *
 * 3. **Percentage travel, not 50px.** A fixed 50px offset is most of the way
 *    across a 14px line but a fraction of a 96px one, so the same component
 *    read as a hard blink in the bubbles and a gentle drift in the headline.
 *    `100%` is relative to the word's own height and looks identical at both.
 */
export function WordRotate({
  words,
  index,
  className = "",
}: {
  words: string[];
  /** Which word to show. Rolls whenever this changes. */
  index: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const word = words[index % words.length] ?? "";

  return (
    // align-bottom keeps the slot sitting on the text baseline of the sentence
    // it lives in; overflow-hidden is what turns the slide into a roll.
    <span className={cn("relative inline-flex overflow-hidden align-bottom", className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={word}
          initial={reduceMotion ? false : { opacity: 0, y: "-100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: "100%" }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="whitespace-nowrap"
        >
          {word}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
