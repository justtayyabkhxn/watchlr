"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles, type LucideIcon } from "lucide-react";
import { ThinkingDots } from "./Loader";
import { cn } from "@/lib/utils";

/* Loading copy, in the house voice. A wait is dead space unless it says
   something, so every spinner in the app names what it's actually doing —
   and keeps talking if the wait runs long.

   Rules for adding lines: lowercase, no emoji, no dingbats, under ~40 chars,
   and each line must be plausibly TRUE of that moment. "counting your
   rewatches" is fine on the roast; "almost done" is a lie and stays out.
   `{title}` interpolates the `subject` prop. */

const SCRIPTS = {
  /** per-title AI summaries */
  ai: [
    "thinking about {title}",
    "rewatching it in my head",
    "checking i'm not making this up",
    "picking the sentences that earn it",
    "leaving the twist alone, i promise",
  ],
  /** the internet's verdict — built from real reviews */
  verdict: [
    "reading the reviews so you don't have to",
    "sorting the hype from the honest",
    "finding the argument in the comments",
    "counting who's lying",
  ],
  /** taste roast */
  roast: [
    "judging you",
    "pulling up the receipts",
    "counting the rewatches",
    "trying to phrase this kindly",
    "this one's going to sting slightly",
  ],
  /** ai picks / reshuffle */
  picks: [
    "shuffling the deck",
    "skipping the obvious ones",
    "checking what you've already seen",
    "consulting your questionable history",
    "finding two you'd never pick yourself",
  ],
  /** watchlist triage — what tonight? */
  triage: [
    "digging through your pile",
    "matching the mood",
    "checking the runtimes",
    "vetoing the three-hour one",
    "narrowing it to three",
  ],
  /** watchlist archaeologist — auditing the dead pile */
  archaeology: [
    "carbon-dating your watchlist",
    "brushing the dust off",
    "reading the timestamps",
    "working out what you meant in 2023",
    "deciding what's worth keeping",
  ],
  /** vibe search */
  vibe: [
    "reading your mind",
    "decoding 'the one with the thing'",
    "narrowing the suspects",
    "i think i know the one",
  ],
  /** title chat */
  chat: ["thinking", "checking the plot", "phrasing it without spoilers"],
  /** plain tmdb search */
  search: ["looking that up", "asking tmdb nicely", "rifling through the shelves"],
  library: ["counting your shelves", "dusting off the pile", "finding where you left off"],
  dashboard: ["adding up the hours", "drawing the charts by hand", "doing maths on your evenings"],
  detail: ["fetching the posters", "pulling the good stuff", "warming up the projector"],
  stream: ["finding somewhere to watch it", "checking who has it this month"],
  profile: ["opening your shelves", "counting the stars you left"],
  generic: ["one sec", "loading the good bit", "nearly there"],
} satisfies Record<string, string[]>;

export type LoadingContext = keyof typeof SCRIPTS;

const CYCLE_MS = 2600;

/**
 * A single rotating line of loading copy. Starts on the first line and moves
 * on every ~2.6s, so a fast response never shows more than one message and a
 * slow one never sits still. Under `prefers-reduced-motion` it locks to the
 * first line — no cycling, no crossfade.
 */
export function LoadingMessage({
  context = "generic",
  subject,
  className = "",
  icon: Icon = Sparkles,
  dots = true,
}: {
  context?: LoadingContext;
  /** Fills `{title}` in the script — the title being loaded, usually. */
  subject?: string;
  className?: string;
  /** Pass `null` to drop the leading icon. */
  icon?: LucideIcon | null;
  dots?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const lines = SCRIPTS[context];
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduceMotion || lines.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % lines.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [reduceMotion, lines.length]);

  const text = (reduceMotion ? lines[0] : lines[i]).replace(
    "{title}",
    subject ?? "it",
  );

  return (
    <p
      // Announced once when it appears; the rotating lines are flavour, not
      // information, so they don't re-announce on every swap.
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-2 text-sm font-bold text-muted", className)}
    >
      {Icon && <Icon className="size-4 shrink-0 animate-pulse text-accent" aria-hidden />}
      <span className="relative inline-flex min-w-0 items-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={text}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="truncate"
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </span>
      {dots && <ThinkingDots className="shrink-0 opacity-60" />}
    </p>
  );
}

/**
 * The AI wait, dressed as a speech bubble — the same hand-drawn wobble the
 * rest of the site uses for anything that "talks". Reach for this wherever
 * the model is composing prose the user is about to read.
 */
export function ThinkingBubble({
  context = "ai",
  subject,
  className = "",
}: {
  context?: LoadingContext;
  subject?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-block max-w-full -rotate-1 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-ink bg-accent-soft px-5 py-3 shadow-offset-xs",
        className,
      )}
    >
      <LoadingMessage context={context} subject={subject} className="text-ink" />
    </div>
  );
}
