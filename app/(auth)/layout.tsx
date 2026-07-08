import Link from "next/link";
import { Clapperboard, Popcorn, Sparkles } from "lucide-react";
import type { MediaItem } from "@/types/tmdb";
import { getTrending } from "@/lib/tmdb";
import { tmdbImage } from "@/lib/media";
import { Marquee } from "@/components/layout/Marquee";
import { AuthDecor, type PosterDecor } from "@/features/auth/AuthDecor";

async function loadPosters(): Promise<PosterDecor[]> {
  try {
    const items: MediaItem[] = await getTrending("movie");
    return items
      .filter((i) => i.posterPath)
      .slice(0, 4)
      .map((i) => ({ id: i.id, title: i.title, src: tmdbImage(i.posterPath, "w185")! }));
  } catch {
    return []; // decor only — page works without TMDB
  }
}

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const posters = await loadPosters();

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* the home-page marquee, running forever behind the card */}
      <div className="absolute inset-x-0 top-1/2 z-0 -translate-y-1/2" aria-hidden>
        <Marquee />
      </div>

      <AuthDecor posters={posters} />

      <Link
        href="/"
        className="group relative z-10 mb-8 flex items-center gap-2 text-2xl font-black tracking-tight active:scale-95"
      >
        <span className="grid size-9 -rotate-6 place-items-center rounded-xl border-2 border-ink bg-accent shadow-offset-xs transition-all duration-200 group-hover:animate-wiggle group-hover:bg-accent-soft">
          <Clapperboard className="size-5" strokeWidth={2.5} aria-hidden />
        </span>
        <span className="transition-transform duration-200 group-hover:-rotate-2">watchlr</span>
      </Link>

      <div className="relative z-10 w-full max-w-sm">
        {/* corner sticker on the card */}
        <span className="absolute -right-4 -top-4 z-20 inline-flex rotate-6 items-center gap-1 rounded-full border-2 border-ink bg-accent px-3 py-1.5 text-xs font-black shadow-offset-xs transition-transform duration-200 hover:-rotate-6 hover:scale-110">
          <Sparkles className="size-3.5" aria-hidden /> free forever
        </span>
        <div className="-rotate-1 rounded-3xl border-2 border-ink bg-card p-6 shadow-offset transition-transform duration-300 hover:rotate-0 sm:p-7">
          {children}
        </div>
      </div>

      <p className="relative z-10 mt-8 hidden -rotate-1 items-center gap-2 rounded-[225px_15px_255px_15px/15px_255px_15px_225px] border-2 border-ink bg-card px-5 py-2 text-xs font-bold text-muted shadow-offset-xs sm:inline-flex">
        <Popcorn className="size-3.5 text-accent" aria-hidden />
        everything floating here is draggable — the posters are real, tap one after you&apos;re in
      </p>
    </div>
  );
}
