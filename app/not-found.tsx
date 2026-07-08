import Link from "next/link";
import { DriftStream, StickerField, type StickerSpec } from "@/features/decor/Doodads";

const STICKERS: StickerSpec[] = [
  { icon: "clapperboard", className: "left-[12%] top-[18%] hidden sm:block", tilt: -10, delay: "0s" },
  { icon: "ghost", className: "right-[14%] top-[24%] hidden sm:block", tilt: 10, delay: "0.8s" },
  { icon: "popcorn", className: "left-[18%] bottom-[16%] hidden sm:block", tilt: 8, delay: "1.5s" },
  { icon: "search", className: "right-[16%] bottom-[20%] hidden sm:block", tilt: -8, delay: "2.2s", size: "sm" },
];

export default function NotFound() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-6">
      <DriftStream />
      <StickerField items={STICKERS} />
      <div className="relative z-10 max-w-md text-center">
        <p className="select-none text-8xl font-black tracking-tighter" aria-hidden>
          4<span className="inline-block -rotate-12 text-accent">0</span>4
        </p>
        <p className="overline-track mt-4 text-accent">Lost the plot</p>
        <h1 className="text-offset mt-2 text-3xl font-black tracking-tight">
          This page isn&apos;t in our catalog.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Deleted scene, wrong reel, or a link that never existed. Either way —
          there&apos;s plenty else to watch. (yes, the stickers are draggable.)
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-bold text-white shadow-offset-sm transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-accent hover:text-ink hover:shadow-offset active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          Back to Watchlr
        </Link>
      </div>
    </div>
  );
}
