"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bookmark,
  Clapperboard,
  Film,
  Flame,
  Ghost,
  Heart,
  Popcorn,
  Search,
  Sparkles,
  Star,
  Trophy,
  Tv,
  type LucideIcon,
} from "lucide-react";

/* Icons are referenced by name so server components can pass specs
   across the RSC boundary (component functions aren't serializable). */
const ICONS = {
  bookmark: Bookmark,
  clapperboard: Clapperboard,
  film: Film,
  flame: Flame,
  ghost: Ghost,
  heart: Heart,
  popcorn: Popcorn,
  search: Search,
  sparkles: Sparkles,
  star: Star,
  trophy: Trophy,
  tv: Tv,
} as const;

export type StickerIcon = keyof typeof ICONS;

/* ------------------------------------------------------------------ */
/* StickerField — draggable, flingable icon tiles scattered on a page.
   Parent must be `relative`; the field itself is the drag boundary.  */
/* ------------------------------------------------------------------ */

export interface StickerSpec {
  icon: StickerIcon;
  className: string; // absolute positioning, e.g. "right-[6%] top-24 hidden lg:block"
  tilt?: number;
  delay?: string;
  size?: "sm" | "md";
}

export function StickerField({ items }: { items: StickerSpec[] }) {
  const bounds = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  return (
    // no overflow-hidden — stickers may poke outside their frame on purpose
    <div ref={bounds} aria-hidden className="pointer-events-none absolute inset-0">
      {items.map((s, i) => {
        const Icon = ICONS[s.icon];
        return (
          <motion.span
            key={i}
            drag={!reduceMotion}
            dragConstraints={bounds}
            dragElastic={0.25}
            dragMomentum
            whileHover={{ scale: 1.2, rotate: 0 }}
            whileDrag={{ scale: 1.3, rotate: 0, zIndex: 30 }}
            initial={{ rotate: s.tilt ?? -6 }}
            className={`group pointer-events-auto absolute cursor-grab touch-none select-none active:cursor-grabbing ${s.className}`}
          >
            {/* hover hint — hides while actually dragging */}
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-ink bg-ink px-2 py-0.5 text-[10px] font-black text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-active:opacity-0">
              drag me!
            </span>
            {/* float on the inner wrapper so it never fights the drag transform */}
            <span
              className={`grid ${s.size === "sm" ? "size-9" : "size-12"} animate-float place-items-center rounded-2xl border-2 border-ink bg-accent-soft shadow-offset-xs`}
              style={{ animationDelay: s.delay ?? "0s" }}
            >
              <Icon className={s.size === "sm" ? "size-4" : "size-5"} strokeWidth={2.25} />
            </span>
          </motion.span>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DriftStream — faint icons crossing the container forever.
   Parent must be `relative`; purely decorative, never interactive.   */
/* ------------------------------------------------------------------ */

interface Lane {
  icon: LucideIcon;
  top: string;
  duration: number;
  delay: number;
  reverse?: boolean;
}

const DEFAULT_LANES: Lane[] = [
  { icon: Film, top: "6%", duration: 44, delay: 0 },
  { icon: Star, top: "24%", duration: 56, delay: -18, reverse: true },
  { icon: Clapperboard, top: "42%", duration: 48, delay: -30 },
  { icon: Popcorn, top: "60%", duration: 52, delay: -8, reverse: true },
  { icon: Tv, top: "76%", duration: 46, delay: -24 },
  { icon: Sparkles, top: "92%", duration: 58, delay: -40, reverse: true },
];

export function DriftStream({ lanes = DEFAULT_LANES }: { lanes?: Lane[] }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {lanes.map(({ icon: Icon, top, duration, delay, reverse }, i) => (
        <motion.span
          key={i}
          className="absolute text-ink/15"
          style={{ top }}
          initial={{ x: reverse ? "108vw" : "-8vw" }}
          animate={{ x: reverse ? "-8vw" : "108vw", rotate: reverse ? -360 : 360 }}
          transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
        >
          <Icon className="size-7" strokeWidth={2} />
        </motion.span>
      ))}
    </div>
  );
}
