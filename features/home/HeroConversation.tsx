"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Popcorn, Sparkles } from "lucide-react";
import { Highlighter } from "@/components/ui/highlighter";
import { WordRotate } from "@/components/ui/WordRotate";

/*
 * The hero's left column, as a conversation.
 *
 * Only ONE WORD moves in each of the three lines — the frames around them never
 * change. Swapping whole sentences meant the eye had to re-read all three every
 * few seconds; swapping a single word lets you read the shape once and then
 * just watch the variable.
 *
 * The rule that makes this work: every row below must be grammatical and true
 * in all three frames at once. Read them as sentences before adding one —
 * "okay but what about the {ask}?" / "{topic}, explained." / "straight answer,
 * no {no}." A word that only works in two of the three doesn't go in.
 *
 * House rule, unchanged: no line may promise something that isn't built. In
 * order these map to the ending_explained, detailed, internet_verdict, themes
 * and spoiler_free summary flavours — all shipped in features/ai/AIPanel.tsx.
 */
const ROWS: { ask: string; topic: string; no: string }[] = [
  { ask: "ending", topic: "endings", no: "hedging" },
  { ask: "twist", topic: "twists", no: "waffle" },
  { ask: "hype", topic: "hype", no: "guessing" },
  { ask: "subtext", topic: "subtext", no: "lectures" },
  { ask: "whole plot", topic: "everything", no: "filler" },
];

/* WordRotate takes a list plus the shared index, so all three lines roll off
   one clock and stay in lockstep. Frozen at module scope rather than derived
   per render. */
const ASKS = ROWS.map((r) => `${r.ask}?`);
const TOPICS = ROWS.map((r) => `${r.topic},`);
const NOS = ROWS.map((r) => `${r.no}.`);

const CYCLE_MS = 3400;

export function HeroConversation() {
  const reduceMotion = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    let id: number | undefined;

    const start = () => {
      id ??= window.setInterval(() => setI((n) => (n + 1) % ROWS.length), CYCLE_MS);
    };
    const stop = () => {
      if (id !== undefined) {
        clearInterval(id);
        id = undefined;
      }
    };

    /* Pause while the tab is hidden. Background tabs get no animation frames,
       so a swap queued there leaves the incoming word parked at opacity 0 —
       the line renders with a hole in it until the tab is focused again. */
    const onVisibility = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduceMotion]);

  // Reduced motion pins every line to the first row.
  const index = reduceMotion ? 0 : i;

  return (
    <div>
      {/* Them. */}
      <p className="relative inline-flex w-full max-w-[21rem] -rotate-2 items-center gap-2 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-ink bg-accent-soft px-6 py-3 text-sm font-black shadow-offset-sm transition-transform duration-300 hover:rotate-1 hover:scale-105">
        <Popcorn className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          okay but what about the <WordRotate words={ASKS} index={index} />
        </span>
        <span
          aria-hidden
          className="absolute -bottom-[9px] left-9 size-4 rotate-45 border-b-2 border-r-2 border-ink bg-accent-soft"
        />
      </p>

      {/* The answer, as the headline. The rotating word gets its own line so it
          can change width freely: "explained." below it never moves, which
          matters because rough-notation redraws its underline whenever the
          annotated element resizes. Underlining the fixed word keeps the
          stroke perfectly still. */}
      <h1 className="text-offset-accent mt-6 text-6xl font-black leading-[0.95] tracking-tight sm:text-8xl">
        <span className="block">
          <WordRotate words={TOPICS} index={index} />
        </span>
        <span className="block">
          <Highlighter action="underline" color="#f59e52" strokeWidth={4} padding={6}>
            explained.
          </Highlighter>
        </span>
      </h1>

      {/* Us. Indented and tilted the other way so the pair reads as a back-and-
          forth rather than two stacked labels. mt-10, not mt-6: the underline
          above is drawn below the text baseline and a tighter gap ran the
          stroke straight through this bubble's top edge. */}
      <div className="mt-10 flex min-h-[3.25rem] items-start pl-8 sm:pl-24">
        <p className="relative inline-flex max-w-[21rem] rotate-1 items-center gap-2 rounded-[15px_255px_15px_225px/225px_15px_255px_15px] border-2 border-ink bg-ink px-5 py-2.5 text-sm font-bold text-white shadow-offset-xs">
          <Sparkles className="size-4 shrink-0 text-accent" aria-hidden />
          <span className="min-w-0 flex-1">
            straight answer, no <WordRotate words={NOS} index={index} />
          </span>
          <span
            aria-hidden
            className="absolute -top-[9px] right-9 size-4 rotate-45 border-l-2 border-t-2 border-ink bg-ink"
          />
        </p>
      </div>
    </div>
  );
}
