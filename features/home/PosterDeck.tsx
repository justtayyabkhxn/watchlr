"use client";

import Image from "next/image";
import { useState } from "react";
import { Shuffle, Star } from "lucide-react";
import type { MediaItem } from "@/types/tmdb";
import { formatRating, tmdbImage } from "@/lib/media";

/*
 * The hero's poster fan.
 *
 * The previous version positioned four posters with `left: 4 + i * 17%` and an
 * alternating top, which stacked them almost on top of each other — three of
 * the four were ~60% buried and one was sliced in half. This lays them out on
 * a real arc: symmetric x offsets, rotation growing toward the edges, centre
 * card on top.
 *
 * Positions are plain inline transforms with a CSS transition, deliberately
 * NOT framer `animate`. A motion-driven resting position only exists once an
 * animation frame has run, so the server markup and the pre-hydration paint
 * had all five cards stacked at the origin — a visible pile-up on every load,
 * and a permanent one in any frame-starved context (a background tab, a
 * throttled device). Inline transforms are correct with zero frames; the
 * transition is pure polish on top.
 *
 * It is also the one thing on the page that shows rather than tells: shuffling
 * a deck is exactly what the AI picks rail does, so the hero demonstrates the
 * product's core gesture before you've signed up.
 */

/* Fan slots, centre-out; index into this array = position in the arc.
   Cards are w-32 (128px) and neighbours sit 90px apart, so ~70% of every
   poster stays visible. If you retune these, keep the gap well above half the
   card width or it stops reading as a fan and starts reading as a pile. */
const SLOTS = [
  { x: -178, y: 30, rot: -14, z: 1 },
  { x: -90, y: 9, rot: -7, z: 2 },
  { x: 0, y: 0, rot: 0, z: 3 },
  { x: 90, y: 9, rot: 7, z: 2 },
  { x: 178, y: 30, rot: 14, z: 1 },
] as const;

export function PosterDeck({ items }: { items: MediaItem[] }) {
  const picks = items.filter((i) => i.posterPath).slice(0, SLOTS.length);

  // `order[slot] = index into picks` — shuffling rotates this, and each card
  // transitions from its old slot's transform to its new one.
  const [order, setOrder] = useState(() => picks.map((_, i) => i));
  const [hovered, setHovered] = useState<number | null>(null);

  if (picks.length === 0) return null;

  const shuffle = () => setOrder((o) => [...o.slice(1), o[0]]);
  const shown = hovered !== null ? picks[hovered] : null;

  return (
    <div className="relative mx-auto flex w-full max-w-lg flex-col items-center">
      {/* The arc is laid out at desktop size and scaled down as a whole on
          narrow screens — simpler than recomputing every offset per breakpoint,
          and it keeps the geometry in one place. `scale` is its own CSS
          property in Tailwind v4, so it never fights the cards' `transform`. */}
      <div className="relative flex h-60 w-full scale-[0.66] items-center justify-center sm:h-80 sm:scale-100">
        {order.map((pickIndex, slot) => {
          const item = picks[pickIndex];
          const pos = SLOTS[slot] ?? SLOTS[SLOTS.length - 1];
          const isHovered = hovered === pickIndex;
          return (
            <button
              key={item.id}
              type="button"
              onClick={shuffle}
              onMouseEnter={() => setHovered(pickIndex)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(pickIndex)}
              onBlur={() => setHovered(null)}
              aria-label={`${item.title} — deal another hand`}
              style={{
                transform: `translate(${pos.x}px, ${pos.y + (isHovered ? -18 : 0)}px) rotate(${
                  isHovered ? 0 : pos.rot
                }deg) scale(${isHovered ? 1.06 : 1})`,
                zIndex: isHovered ? 20 : pos.z,
              }}
              className="absolute w-24 cursor-pointer rounded-2xl transition-transform duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:w-32"
            >
              <span className="relative block overflow-hidden rounded-2xl border-4 border-white shadow-lift">
                <Image
                  src={tmdbImage(item.posterPath, "w342")!}
                  alt=""
                  width={342}
                  height={513}
                  // All five sit above the fold, so none of them should be
                  // lazy — the outer cards were still blank white rectangles
                  // when the hero first painted.
                  priority
                  draggable={false}
                  className="aspect-[2/3] w-full object-cover"
                />
              </span>
              {/* Only the lifted card shows its score — five badges at once
                  collided into an unreadable clump above the fan. */}
              {item.voteAverage > 0 && isHovered && (
                <span className="absolute -right-2 -top-2 inline-flex rotate-6 items-center gap-1 rounded-full border-2 border-ink bg-accent-soft px-2 py-0.5 text-[11px] font-black shadow-offset-xs">
                  <Star className="size-3 fill-ink" aria-hidden />
                  {formatRating(item.voteAverage)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Caption doubles as the affordance: it names the hovered title, and
          otherwise tells you the deck is clickable. Fixed height so the fan
          never shifts vertically as the text swaps. */}
      <div className="mt-2 flex h-9 items-center justify-center">
        {shown ? (
          <span className="inline-flex max-w-full -rotate-1 items-center gap-1.5 truncate rounded-full border-2 border-ink bg-card px-3 py-1.5 text-xs font-black shadow-offset-xs">
            {shown.title}
          </span>
        ) : (
          <button
            type="button"
            onClick={shuffle}
            className="group inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-accent px-3 py-1.5 text-xs font-black shadow-offset-xs transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-offset-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <Shuffle className="size-3.5 group-hover:animate-wiggle" aria-hidden />
            deal me another
          </button>
        )}
      </div>
    </div>
  );
}
