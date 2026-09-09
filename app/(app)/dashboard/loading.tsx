import { CardSkeleton, PageSkeleton, Skeleton, SkeletonText, StatTileSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatTileSkeleton key={i} index={i} />
        ))}
      </div>
      <div className="mt-6 space-y-6">
        {[0, 1].map((i) => (
          <CardSkeleton key={i} index={i + 4} className="h-64">
            <Skeleton index={i} className="h-3 w-24" />
            <Skeleton index={i + 1} className="mt-3 h-6 w-48" />
            <SkeletonText lines={3} className="mt-6" lineClassName="h-8" />
          </CardSkeleton>
        ))}
      </div>
    </PageSkeleton>
  );
}
