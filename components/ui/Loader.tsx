import { Clapperboard, type LucideIcon } from "lucide-react";

/* Spinners, watchlr-style. A smooth 360° throbber is the one thing on this
   site that would look store-bought, so nothing here spins freely:
   - StickerLoader rocks side to side like a badge pinned by one corner
   - ReelLoader steps in quarter turns, sprocket by sprocket
   - ThinkingDots is three ink dots taking turns
   All three are decorative; the surrounding component owns the aria live text. */

const sizes = {
  sm: { box: "size-8", icon: "size-4" },
  md: { box: "size-11", icon: "size-5" },
  lg: { box: "size-14", icon: "size-6" },
} as const;

/** The default watchlr loader: an icon in a sticker tile, rocking. */
export function StickerLoader({
  icon: Icon = Clapperboard,
  size = "md",
  className = "",
}: {
  icon?: LucideIcon;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const s = sizes[size];
  return (
    <span
      aria-hidden
      className={`grid ${s.box} shrink-0 animate-tumble place-items-center rounded-2xl border-2 border-ink bg-accent-soft shadow-offset-xs ${className}`}
    >
      <Icon className={s.icon} strokeWidth={2.25} />
    </span>
  );
}

/** Film reel that advances in quarter turns — for waits on media itself. */
export function ReelLoader({ size = "md", className = "" }: { size?: keyof typeof sizes; className?: string }) {
  const s = sizes[size];
  return (
    <span aria-hidden className={`grid ${s.box} shrink-0 place-items-center ${className}`}>
      <svg viewBox="0 0 32 32" className="size-full animate-reel">
        <circle cx="16" cy="16" r="14" fill="var(--color-accent-soft)" stroke="var(--color-ink)" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="3.2" fill="var(--color-ink)" />
        {[0, 90, 180, 270].map((deg) => (
          <circle
            key={deg}
            cx={16 + 8 * Math.cos((deg * Math.PI) / 180)}
            cy={16 + 8 * Math.sin((deg * Math.PI) / 180)}
            r="2.4"
            fill="var(--color-ink)"
          />
        ))}
      </svg>
    </span>
  );
}

/** Three dots bobbing in sequence, inked in `currentColor` so the same
    component works on a white card and inside a solid ink button. */
export function ThinkingDots({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-flex items-end gap-1 pb-0.5 ${className}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bob-dot rounded-full bg-current"
          style={{ animationDelay: `${i * 140}ms` }}
        />
      ))}
    </span>
  );
}

/**
 * Indeterminate bar, for waits with no honest percentage. Sits inside an ink
 * border so it reads as part of the sticker world, not a browser chrome bar.
 */
export function CrawlBar({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block h-2 w-full overflow-hidden rounded-full border-2 border-ink bg-card ${className}`}
    >
      <span className="block h-full w-full origin-left animate-crawl rounded-full bg-accent" />
    </span>
  );
}
