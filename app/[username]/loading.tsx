import { CardSkeleton, PosterSkeleton, Skeleton, StatTileSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <CardSkeleton className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Skeleton className="size-20 shrink-0 -rotate-6 rounded-3xl" />
        <div className="w-full min-w-0 space-y-3">
          <Skeleton index={1} className="h-8 w-56 max-w-full" />
          <Skeleton index={2} className="h-3 w-40" />
        </div>
      </CardSkeleton>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatTileSkeleton key={i} index={i} />
        ))}
      </div>
      {/* two shelves' worth of posters — public profiles always show at least these */}
      {[0, 1].map((row) => (
        <div key={row} className="mt-12">
          <Skeleton index={row} className="h-3 w-28" />
          <Skeleton index={row + 1} className="mt-3 h-9 w-56" />
          <div className="no-scrollbar -mx-6 mt-6 flex gap-5 overflow-hidden px-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <PosterSkeleton key={i} index={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
