import { ChipSkeleton, Skeleton } from "@/components/ui/Skeleton";

/* Mirrors the real page: header, the constraint strip, the starter card and
   the composer — so nothing reflows when the conversation lands. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-6 pb-10">
      <header className="pb-6 pt-10">
        <Skeleton className="h-3 w-32" />
        <Skeleton index={1} className="mt-3 h-11 w-80 max-w-full" />
        <Skeleton index={2} className="mt-4 h-4 w-full max-w-lg" />
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b-2 border-border py-3">
        <Skeleton className="h-3 w-20" />
        <ChipSkeleton index={1} className="w-24" />
        <ChipSkeleton index={2} className="w-20" />
      </div>

      <div className="mt-7 rounded-3xl border-2 border-ink bg-card p-6 shadow-offset">
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 flex flex-wrap gap-2.5">
          {["w-52", "w-40", "w-44", "w-48"].map((w, i) => (
            <ChipSkeleton key={w} index={i} className={w} />
          ))}
        </div>
      </div>

      <Skeleton index={3} className="mt-7 h-14 w-full rounded-full" />
    </div>
  );
}
