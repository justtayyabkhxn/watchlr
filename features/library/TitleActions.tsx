"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Bookmark,
  Check,
  Eye,
  EyeOff,
  Heart,
  Play,
  Star,
  ThumbsDown,
} from "lucide-react";
import type { LibraryStatus } from "@/models/Watchlist";
import {
  useLibraryStatus,
  useLogWatch,
  useRatings,
  useSetRating,
  useSetStatus,
  useTitleHistory,
  type TitlePayload,
} from "./hooks";
import { AddToCollection } from "./AddToCollection";

const STATUS_OPTIONS: { value: LibraryStatus; label: string; icon: typeof Eye }[] = [
  { value: "want_to_watch", label: "Want to watch", icon: Bookmark },
  { value: "watching", label: "Watching", icon: Eye },
  { value: "completed", label: "Completed", icon: Check },
  { value: "favorite", label: "Favorite", icon: Heart },
  { value: "dropped", label: "Dropped", icon: ThumbsDown },
  { value: "hidden", label: "Hidden", icon: EyeOff },
];

export function StarRating({
  tmdbId,
  mediaType,
}: {
  tmdbId: number;
  mediaType: "movie" | "tv";
}) {
  const { data } = useRatings(tmdbId, mediaType);
  const setRating = useSetRating(tmdbId, mediaType);
  const [hover, setHover] = useState<number | null>(null);
  const current = hover ?? data?.mine ?? 0;

  return (
    <div>
      <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Your rating out of 10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={data?.mine === v}
            aria-label={`${v} out of 10`}
            onMouseEnter={() => setHover(v)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setRating.mutate(v)}
            className="p-0.5 transition-transform hover:scale-125"
          >
            <Star
              className={`size-5 transition-colors ${v <= current ? "fill-accent text-accent" : "text-border"}`}
            />
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs font-semibold text-muted">
        {data?.mine ? `You rated it ${data.mine}/10` : "Rate it"}
        {data?.count ? ` · watchlr avg ${data.average?.toFixed(1)} (${data.count})` : ""}
      </p>
    </div>
  );
}

export function TitleActions({ item }: { item: TitlePayload }) {
  const { status: authStatus } = useSession();
  const signedIn = authStatus === "authenticated";
  const { data: status } = useLibraryStatus(item.tmdbId, item.mediaType, signedIn);
  const setStatus = useSetStatus(item);
  const logWatch = useLogWatch(item);
  const { data: history } = useTitleHistory(item.tmdbId, item.mediaType, signedIn);
  const watchCount = history?.entries.length ?? 0;

  if (!signedIn) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/login"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white transition-colors hover:bg-accent hover:text-ink"
        >
          <Bookmark className="size-4" aria-hidden />
          Sign in to track this
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = status === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setStatus.mutate(active ? null : value)}
              className={`inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-all ${
                active
                  ? "-rotate-1 bg-ink text-white shadow-offset-xs"
                  : "border-2 border-border bg-card text-muted hover:border-accent hover:text-ink"
              }`}
            >
              <Icon className={`size-4 ${active && value === "favorite" ? "fill-accent text-accent" : ""}`} aria-hidden />
              {label}
            </button>
          );
        })}
        <AddToCollection item={item} />
        {item.mediaType === "movie" && (
          <button
            type="button"
            onClick={() => logWatch.mutate(undefined)}
            disabled={logWatch.isPending}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-black transition-transform hover:-rotate-1 hover:scale-105 disabled:opacity-60"
          >
            <Play className="size-4" aria-hidden />
            {watchCount > 0 ? `Watched ×${watchCount} — log again` : "Log a watch"}
          </button>
        )}
      </div>
      <StarRating tmdbId={item.tmdbId} mediaType={item.mediaType} />
    </div>
  );
}
