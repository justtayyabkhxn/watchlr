import { Clapperboard, Film } from "lucide-react";

/* The house loading vocabulary. Rules it follows, per DESIGN.md:
   - warm, never grey: tan placeholder + amber sheen (`skeleton` utility)
   - a skeleton mirrors the shape it replaces, so nothing jumps on arrival
   - staggered: each item's sheen starts a beat after the last, so a grid
     reads as one wave instead of a wall of flashing blocks
   The `stagger` helper is the only way delays are set — keep it consistent. */

/** Sheen delay for the nth item in a list, wrapped so long lists don't drift. */
export function stagger(index: number, step = 90): React.CSSProperties {
  return { animationDelay: `${(index % 8) * step}ms` };
}

export function Skeleton({
  className = "",
  style,
  index,
}: {
  className?: string;
  style?: React.CSSProperties;
  /** Position in a list — sets the sheen delay so grids ripple. */
  index?: number;
}) {
  return (
    <div
      aria-hidden
      style={index === undefined ? style : { ...stagger(index), ...style }}
      className={`skeleton rounded-2xl ${className}`}
    />
  );
}

/** Paragraph placeholder — last line is short, like real prose. */
export function SkeletonText({
  lines = 3,
  className = "",
  lineClassName = "h-4",
}: {
  lines?: number;
  className?: string;
  lineClassName?: string;
}) {
  const widths = ["w-full", "w-11/12", "w-full", "w-4/5", "w-11/12", "w-3/4"];
  return (
    <div aria-hidden className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          index={i}
          className={`${lineClassName} ${i === lines - 1 ? "w-2/3" : widths[i % widths.length]}`}
        />
      ))}
    </div>
  );
}

/**
 * Poster placeholder. Not a plain rectangle — it borrows the poster card's
 * tilt and drops a faint film watermark in the middle, so an empty rail still
 * looks like watchlr rather than a wireframe.
 */
export function PosterSkeleton({
  index = 0,
  className = "w-40 shrink-0 sm:w-44",
}: {
  index?: number;
  className?: string;
}) {
  const tilt = ["-rotate-2", "rotate-1", "rotate-2", "-rotate-1"][index % 4];
  return (
    <div aria-hidden className={className}>
      <div
        style={stagger(index)}
        className={`sheen grid aspect-[2/3] w-full place-items-center rounded-3xl border-2 border-dashed border-border bg-border/70 ${tilt}`}
      >
        <Film className="size-7 text-muted/30" strokeWidth={2.25} aria-hidden />
      </div>
      <Skeleton index={index} className="mt-3 h-4 w-3/4" />
      <Skeleton index={index + 1} className="mt-2 h-3 w-1/2" />
    </div>
  );
}

/** A grid of poster placeholders at the app's standard result-grid density. */
export function PosterGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-8 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <PosterSkeleton key={i} index={i} className="w-full" />
      ))}
    </div>
  );
}

/** Card-shaped placeholder that keeps the ink border + offset shadow, so the
    page's weight and rhythm don't change when content lands. */
export function CardSkeleton({
  className = "",
  index = 0,
  children,
}: {
  className?: string;
  index?: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      style={stagger(index)}
      className={`rounded-3xl border-2 border-ink bg-card p-6 shadow-offset ${className}`}
    >
      {children}
    </div>
  );
}

/** Dashboard stat tile: sticker icon slot, big number, caption. */
export function StatTileSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      aria-hidden
      style={stagger(index)}
      className="rounded-3xl border-2 border-ink bg-card p-5 shadow-offset"
    >
      <Skeleton index={index} className="size-9 -rotate-6 rounded-2xl" />
      <Skeleton index={index + 1} className="mt-4 h-8 w-20" />
      <Skeleton index={index + 2} className="mt-2 h-3 w-24" />
    </div>
  );
}

/** Row in a list (episodes, providers, sources) — thumb + two lines. */
export function RowSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      aria-hidden
      style={stagger(index)}
      className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-3"
    >
      <Skeleton index={index} className="size-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton index={index} className="h-3.5 w-1/2" />
        <Skeleton index={index + 1} className="h-3 w-1/3" />
      </div>
    </div>
  );
}

/** Sticker-chip placeholder, for filter/tab rows. */
export function ChipSkeleton({ index = 0, className = "w-20" }: { index?: number; className?: string }) {
  return <Skeleton index={index} className={`h-7 rounded-full ${className}`} />;
}

/** The rail header + a run of posters, used by Suspense boundaries on home. */
export function RailSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="mb-6">
        <Skeleton className="h-3 w-32" />
        <Skeleton index={1} className="mt-3 h-9 w-64" />
      </div>
      <div className="no-scrollbar -mx-6 flex gap-5 overflow-hidden px-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <PosterSkeleton key={i} index={i} />
        ))}
      </div>
    </section>
  );
}

/** Big empty stage for a whole route that hasn't resolved: page title bones
    plus a slowly tumbling clapperboard so the wait has something alive in it. */
export function PageSkeleton({
  overline = true,
  children,
}: {
  overline?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <header className="mb-10 flex items-center gap-4">
        <span className="grid size-12 shrink-0 -rotate-6 animate-tumble place-items-center rounded-2xl border-2 border-ink bg-accent-soft shadow-offset-xs">
          <Clapperboard className="size-6" strokeWidth={2.25} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          {overline && <Skeleton className="h-3 w-28" />}
          <Skeleton index={1} className="mt-3 h-10 w-72 max-w-full" />
        </div>
      </header>
      {children}
    </div>
  );
}
