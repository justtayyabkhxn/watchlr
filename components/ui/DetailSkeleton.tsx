import { ChipSkeleton, Skeleton, SkeletonText, stagger } from "./Skeleton";
import { LoadingMessage } from "./LoadingMessage";
import { Film } from "lucide-react";

/**
 * Full-page skeleton for movie/tv detail routes — mirrors DetailHero's layout
 * exactly (poster width, heading scale, chip row, two-column body) so the real
 * page settles into the same boxes instead of reflowing when it arrives.
 */
export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 pt-40 sm:pt-56">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
        <div
          style={stagger(0)}
          className="sheen grid aspect-[2/3] w-44 shrink-0 -rotate-2 place-items-center rounded-3xl border-2 border-dashed border-border bg-border/70 sm:w-60"
        >
          <Film className="size-9 text-muted/30" strokeWidth={2.25} aria-hidden />
        </div>
        <div className="w-full max-w-xl space-y-4 pb-2">
          <Skeleton index={0} className="h-3 w-32" />
          <Skeleton index={1} className="h-14 w-4/5" />
          <Skeleton index={2} className="h-4 w-56" />
          <div className="flex gap-2">
            {["w-20", "w-24", "w-16"].map((w, i) => (
              <ChipSkeleton key={w} index={i} className={w} />
            ))}
          </div>
          <LoadingMessage context="detail" className="pt-2" />
        </div>
      </div>
      <div className="mt-14 grid gap-12 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <SkeletonText lines={3} />
          <Skeleton index={3} className="mt-10 h-72 w-full rounded-3xl" />
        </div>
        <div className="space-y-6">
          <Skeleton index={4} className="h-48 w-full rounded-3xl" />
          <Skeleton index={5} className="h-40 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
