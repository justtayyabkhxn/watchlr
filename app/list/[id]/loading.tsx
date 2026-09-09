import { PageSkeleton, PosterGridSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PosterGridSkeleton count={10} />
    </PageSkeleton>
  );
}
