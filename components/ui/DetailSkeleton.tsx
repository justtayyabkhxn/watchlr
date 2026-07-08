import { Skeleton } from "./Skeleton";

/** Full-page skeleton for movie/tv detail routes — mirrors DetailHero layout. */
export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 pt-40 sm:pt-56">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
        <Skeleton className="aspect-[2/3] w-44 shrink-0 rounded-3xl sm:w-60" />
        <div className="w-full max-w-xl space-y-4 pb-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-14 w-4/5" />
          <Skeleton className="h-4 w-56" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        </div>
      </div>
      <div className="mt-14 grid gap-12 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-10 h-72 w-full rounded-3xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
