import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Eye, Popcorn, Sparkles } from "lucide-react";
import type { MediaItem } from "@/types/tmdb";
import { auth } from "@/lib/auth";
import { tmdbImage } from "@/lib/media";
import { Sticker } from "@/components/ui/Badge";
import { Highlighter } from "@/components/ui/highlighter";
import { StickerField, type StickerSpec } from "@/features/decor/Doodads";

const rotations = ["-rotate-6", "rotate-3", "-rotate-2", "rotate-6"];

const floaties: StickerSpec[] = [
  { icon: "popcorn", className: "-left-2 top-2", tilt: -12, delay: "0s" },
  { icon: "star", className: "right-0 -top-4", tilt: 12, delay: "0.8s" },
  { icon: "clapperboard", className: "-right-3 bottom-16", tilt: 6, delay: "1.6s" },
  { icon: "sparkles", className: "left-6 bottom-0", tilt: -6, delay: "2.4s" },
];

function PosterFan({ items }: { items: MediaItem[] }) {
  const picks = items.filter((i) => i.posterPath).slice(0, 4);
  if (picks.length === 0) return null;

  return (
    <div className="relative mx-auto flex h-72 w-full max-w-md items-center justify-center sm:h-96" aria-hidden>
      {picks.map((item, i) => (
        <div
          key={item.id}
          className={`absolute w-36 overflow-hidden rounded-2xl border-4 border-white shadow-lift transition-transform duration-300 hover:z-10 hover:scale-105 sm:w-44 ${rotations[i % rotations.length]}`}
          style={{ left: `${4 + i * 17}%`, top: `${i % 2 === 0 ? 6 : 22}%` }}
        >
          <Image
            src={tmdbImage(item.posterPath, "w342")!}
            alt=""
            width={342}
            height={513}
            priority={i < 2}
            className="aspect-[2/3] object-cover"
          />
        </div>
      ))}
      <StickerField items={floaties} />
      <Sticker className="absolute -bottom-2 left-1/2 z-10 -translate-x-1/2 animate-float" rotate="-rotate-3">
        <Sparkles className="size-3.5" aria-hidden /> now trending
      </Sticker>
    </div>
  );
}

export async function Hero({ trending }: { trending: MediaItem[] }) {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1.2fr_1fr]">
      <div>
        {/* hand-drawn wobbly speech bubble with a tail */}
        <p className="relative inline-flex -rotate-2 items-center gap-2 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-ink bg-accent-soft px-6 py-3 text-sm font-black shadow-offset-sm transition-transform duration-300 hover:rotate-1 hover:scale-105">
          <Popcorn className="size-4" aria-hidden />
          psst… what are we watching tonight?
          <span
            aria-hidden
            className="absolute -bottom-[9px] left-9 size-4 rotate-45 border-b-2 border-r-2 border-ink bg-accent-soft"
          />
        </p>
        <h1 className="text-offset-accent mt-6 text-6xl font-black leading-[0.95] tracking-tight sm:text-8xl">
          Good{" "}
          <Highlighter action="underline" color="#f59e52" strokeWidth={4} padding={6}>
            question.
          </Highlighter>
        </h1>
        <p className="mt-7 max-w-md text-lg leading-relaxed text-muted">
          Watchlr tracks everything you watch — and its AI explains endings,
          dodges spoilers, and tells you if tonight&apos;s pick is worth it.
        </p>
        <div className="mt-9 flex items-center gap-3 sm:gap-4">
          <Link
            href={signedIn ? "/library" : "/register"}
            className="group inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-4 text-sm font-bold sm:h-13 sm:gap-2 sm:px-8 sm:text-base text-white shadow-offset-sm transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-accent hover:text-ink hover:shadow-offset active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            {signedIn ? "Keep tracking" : "Start tracking"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
          <Link
            href="/search"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-ink bg-card px-4 text-sm font-bold sm:h-13 sm:gap-2 sm:px-8 sm:text-base shadow-offset-sm transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-surface-hover hover:shadow-offset active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            <Eye className="size-4" aria-hidden />
            Just browsing
          </Link>
        </div>
        <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
          {[
            ["1M+", "titles to track"],
            ["5", "kinds of AI summaries"],
            ["0", "spoilers, ever"],
          ].map(([num, label]) => (
            <p key={label} className="transition-transform duration-200 hover:-rotate-3 hover:scale-110">
              <span className="block text-3xl font-black">{num}</span>
              <span className="text-xs font-bold text-muted">{label}</span>
            </p>
          ))}
        </div>
      </div>
      <PosterFan items={trending} />
    </section>
  );
}
