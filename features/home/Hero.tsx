import Link from "next/link";
import { ArrowRight, Eye, Sparkles } from "lucide-react";
import type { MediaItem } from "@/types/tmdb";
import { auth } from "@/lib/auth";
import { Sticker } from "@/components/ui/Badge";
import { StickerField, type StickerSpec } from "@/features/decor/Doodads";
import { HeroConversation } from "./HeroConversation";
import { PosterDeck } from "./PosterDeck";

/* Stickers sit outside the deck's arc so they never land on a poster face.
   The deck is interactive now, and a floating tile over a card would steal
   the click. */
const floaties: StickerSpec[] = [
  { icon: "popcorn", className: "-left-4 top-0", tilt: -12, delay: "0s", size: "sm" },
  { icon: "star", className: "-right-2 -top-2", tilt: 12, delay: "0.8s", size: "sm" },
  { icon: "ghost", className: "-left-2 bottom-8", tilt: 6, delay: "1.6s", size: "sm" },
  { icon: "trophy", className: "-right-4 bottom-12", tilt: -6, delay: "2.4s", size: "sm" },
];

/* Claims are checked against what actually ships: the AI panel has six
   flavours (features/ai/AIPanel.tsx). It said five for a while — if you add or
   remove a tab, this number moves with it.

   The last one used to read "0 spoilers, ever", which was simply untrue: the
   panel has a spoiler gate you can walk through on purpose. "unless you ask"
   is the honest version and a better line anyway. */
const STATS: { num: string; label: string; tilt: string }[] = [
  { num: "1m+", label: "titles, give or take", tilt: "-rotate-2" },
  { num: "6", label: "ways to explain a plot", tilt: "rotate-1" },
  { num: "0", label: "spoilers unless you ask", tilt: "-rotate-1" },
];

export async function Hero({ trending }: { trending: MediaItem[] }) {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_1fr]">
      <div>
        <HeroConversation />

        <p className="mt-7 max-w-md text-lg leading-relaxed text-muted">
          Every film, every episode, every rewatch you&apos;d deny under oath.
          Plus an AI that explains endings, keeps spoilers to itself, and says
          whether tonight&apos;s pick is{" "}
          <span className="font-bold text-ink">worth your evening</span>.
        </p>

        <div className="mt-9 flex items-center gap-3 sm:gap-4">
          <Link
            href={signedIn ? "/library" : "/register"}
            className="group inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-4 text-sm font-bold sm:h-13 sm:gap-2 sm:px-8 sm:text-base text-white shadow-offset-sm transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-accent hover:text-ink hover:shadow-offset active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            {signedIn ? "Back to your pile" : "Start your pile"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
          <Link
            href="/search"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-ink bg-card px-4 text-sm font-bold sm:h-13 sm:gap-2 sm:px-8 sm:text-base shadow-offset-sm transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-surface-hover hover:shadow-offset active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            <Eye className="size-4" aria-hidden />
            Show me around
          </Link>
        </div>

        {/* Sticker tiles, not bare numerals — everything else on this page
            that carries weight sits on an ink border with an offset shadow,
            and three naked numbers read as a different site. */}
        <div className="mt-12 flex flex-wrap gap-3">
          {STATS.map(({ num, label, tilt }) => (
            <div
              key={label}
              className={`${tilt} rounded-2xl border-2 border-ink bg-card px-4 py-3 shadow-offset-xs transition-transform duration-200 hover:rotate-0 hover:scale-105`}
            >
              <span className="block text-3xl font-black leading-none">{num}</span>
              <span className="mt-1.5 block text-xs font-bold text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Deck lives in its own positioning context so the stickers hang off
          the frame rather than the section. */}
      <div className="relative">
        <PosterDeck items={trending} />
        <StickerField items={floaties} />
        <Sticker className="absolute -top-4 left-1/2 z-10 -translate-x-1/2 animate-float" rotate="-rotate-3">
          <Sparkles className="size-3.5" aria-hidden /> trending tonight
        </Sticker>
      </div>
    </section>
  );
}
