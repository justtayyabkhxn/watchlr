import { CardSkeleton, Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-14">
      <CardSkeleton className="flex items-center gap-5">
        <Skeleton className="size-16 shrink-0 -rotate-6 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton index={1} className="h-6 w-48" />
          <Skeleton index={2} className="h-3 w-32" />
        </div>
      </CardSkeleton>
      <CardSkeleton index={1}>
        <SkeletonText lines={5} />
      </CardSkeleton>
      <CardSkeleton index={2}>
        <SkeletonText lines={3} />
      </CardSkeleton>
    </div>
  );
}
