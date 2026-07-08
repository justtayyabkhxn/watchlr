import { Sparkle } from "lucide-react";

const phrases = [
  "track everything you watch",
  "endings, explained",
  "spoiler-free summaries",
  "what should I watch tonight?",
  "your year in film",
  "no more doomscrolling netflix",
];

/** Full-bleed slightly-tilted scrolling ticker strip. */
export function Marquee() {
  return (
    <div className="relative -mx-2 -rotate-1 overflow-hidden border-y-2 border-ink bg-accent py-3" aria-hidden>
      <div className="flex w-max animate-marquee gap-0">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {phrases.map((p) => (
              <span
                key={`${copy}-${p}`}
                className="flex items-center gap-6 whitespace-nowrap px-6 text-sm font-black"
              >
                {p}
                <Sparkle className="size-4 animate-spin-slow fill-ink" aria-hidden />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
