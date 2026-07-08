export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-2xl bg-border ${className}`}
    />
  );
}

export function PosterSkeleton() {
  return (
    <div className="w-40 shrink-0 sm:w-44">
      <Skeleton className="aspect-[2/3] w-full rounded-3xl" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}
