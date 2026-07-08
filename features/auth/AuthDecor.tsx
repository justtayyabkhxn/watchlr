"use client";

import { useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  Clapperboard,
  Film,
  Ghost,
  Heart,
  Popcorn,
  Sparkles,
  Star,
  Tv,
  type LucideIcon,
} from "lucide-react";

export interface PosterDecor {
  id: number;
  title: string;
  src: string;
}

const POSTER_SPOTS = [
  { className: "left-[4%] top-[10%]", tilt: -6, float: "0s" },
  { className: "right-[5%] top-[14%]", tilt: 6, float: "1.2s" },
  { className: "left-[8%] bottom-[12%]", tilt: 3, float: "0.6s" },
  { className: "right-[9%] bottom-[8%]", tilt: -3, float: "1.8s" },
];

const FLOATIES: { icon: LucideIcon; className: string; tilt: number; delay: string }[] = [
  { icon: Popcorn, className: "left-[22%] top-[6%]", tilt: -12, delay: "0s" },
  { icon: Star, className: "right-[24%] top-[8%]", tilt: 12, delay: "0.9s" },
  { icon: Ghost, className: "left-[20%] bottom-[7%]", tilt: 6, delay: "1.5s" },
  { icon: Heart, className: "right-[21%] bottom-[10%]", tilt: -6, delay: "2.2s" },
];

/* endless slow stream of icons drifting across the whole screen */
const DRIFTERS: { icon: LucideIcon; top: string; duration: number; delay: number; reverse?: boolean }[] = [
  { icon: Film, top: "8%", duration: 44, delay: 0 },
  { icon: Star, top: "22%", duration: 56, delay: -18, reverse: true },
  { icon: Clapperboard, top: "36%", duration: 48, delay: -30 },
  { icon: Popcorn, top: "64%", duration: 52, delay: -8, reverse: true },
  { icon: Tv, top: "78%", duration: 46, delay: -24 },
  { icon: Sparkles, top: "90%", duration: 58, delay: -40, reverse: true },
];

export function AuthDecor({ posters }: { posters: PosterDecor[] }) {
  const router = useRouter();
  const bounds = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  return (
    <div ref={bounds} className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* infinite drift layer */}
      {!reduceMotion &&
        DRIFTERS.map(({ icon: Icon, top, duration, delay, reverse }, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute text-ink/15"
            style={{ top }}
            initial={{ x: reverse ? "108vw" : "-8vw" }}
            animate={{ x: reverse ? "-8vw" : "108vw", rotate: reverse ? -360 : 360 }}
            transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
          >
            <Icon className="size-7" strokeWidth={2} />
          </motion.span>
        ))}

      {/* draggable trending posters — tap to open the title */}
      {posters.slice(0, POSTER_SPOTS.length).map((p, i) => (
        <motion.div
          key={p.id}
          drag={!reduceMotion}
          dragConstraints={bounds}
          dragElastic={0.25}
          dragMomentum
          onTap={() => router.push(`/movie/${p.id}`)}
          whileHover={{ scale: 1.08, rotate: 0 }}
          whileDrag={{ scale: 1.12, rotate: 0, zIndex: 30 }}
          initial={{ rotate: POSTER_SPOTS[i].tilt }}
          title={`${p.title} — drag me, or tap to open`}
          className={`group pointer-events-auto absolute hidden w-28 cursor-grab touch-none active:cursor-grabbing lg:block ${POSTER_SPOTS[i].className}`}
        >
          <span className="absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-ink bg-ink px-2 py-0.5 text-[10px] font-black text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-active:opacity-0">
            drag me · tap to open
          </span>
          {/* float on an inner wrapper so it never fights the drag transform */}
          <div
            className="animate-float overflow-hidden rounded-2xl border-4 border-white shadow-lift"
            style={{ animationDelay: POSTER_SPOTS[i].float }}
          >
            <Image
              src={p.src}
              alt={p.title}
              width={185}
              height={278}
              className="pointer-events-none aspect-[2/3] object-cover"
              draggable={false}
            />
          </div>
        </motion.div>
      ))}

      {/* draggable icon stickers */}
      {FLOATIES.map(({ icon: Icon, className, tilt, delay }, i) => (
        <motion.span
          key={i}
          aria-hidden
          drag={!reduceMotion}
          dragConstraints={bounds}
          dragElastic={0.25}
          dragMomentum
          whileHover={{ scale: 1.2, rotate: 0 }}
          whileDrag={{ scale: 1.3, rotate: 0, zIndex: 30 }}
          initial={{ rotate: tilt }}
          className={`group pointer-events-auto absolute hidden cursor-grab touch-none select-none active:cursor-grabbing sm:block ${className}`}
        >
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-ink bg-ink px-2 py-0.5 text-[10px] font-black text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-active:opacity-0">
            drag me!
          </span>
          <span
            className="grid size-12 animate-float place-items-center rounded-2xl border-2 border-ink bg-accent-soft shadow-offset-xs"
            style={{ animationDelay: delay }}
          >
            <Icon className="size-5" strokeWidth={2.25} />
          </span>
        </motion.span>
      ))}
    </div>
  );
}
