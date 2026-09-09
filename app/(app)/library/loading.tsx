import { CardSkeleton, ChipSkeleton, PageSkeleton, PosterGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      {/* the triage card holds its full height so the shelves below don't shift */}
      <CardSkeleton className="mb-8">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 shrink-0 -rotate-6 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton index={1} className="h-5 w-64 max-w-full" />
            <Skeleton index={2} className="h-3 w-80 max-w-full" />
          </div>
        </div>
        <Skeleton index={3} className="mt-4 h-11 w-full rounded-full" />
      </CardSkeleton>
      <div className="mb-8 flex flex-wrap gap-2">
        {["w-24", "w-20", "w-28", "w-24", "w-20", "w-16"].map((w, i) => (
          <ChipSkeleton key={w} index={i} className={w} />
        ))}
      </div>
      <PosterGridSkeleton count={10} />
    </PageSkeleton>
  );
}
