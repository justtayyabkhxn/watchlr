import { PageSkeleton, ChipSkeleton, PosterGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      {/* search bar + filter chips, so the controls don't pop in late */}
      <Skeleton className="h-12 w-full max-w-xl rounded-full" />
      <div className="mt-5 flex flex-wrap gap-2">
        {["w-20", "w-24", "w-16", "w-28", "w-20"].map((w, i) => (
          <ChipSkeleton key={w} index={i} className={w} />
        ))}
      </div>
      <div className="mt-10">
        <PosterGridSkeleton count={10} />
      </div>
    </PageSkeleton>
  );
}
