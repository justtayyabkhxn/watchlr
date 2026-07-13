"use client";

import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlayCircle, X } from "lucide-react";
import { tmdbImage } from "@/lib/media";
import { PosterSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

interface HistoryEntry {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  watchedAt: string;
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ContinueWatching() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["history", "continue-watching"],
    queryFn: async (): Promise<{ entries: HistoryEntry[] }> => {
      const res = await fetch("/api/history?source=stream");
      if (!res.ok) throw new Error("Failed to load watch history");
      return res.json();
    },
  });

  const remove = useMutation({
    mutationFn: async (e: HistoryEntry) => {
      await fetch(`/api/history?tmdbId=${e.tmdbId}&mediaType=${e.mediaType}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["history"] }),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <PosterSkeleton key={i} />
        ))}
      </div>
    );
  }

  // API returns newest-first; keep only the most recent entry per title.
  const seen = new Set<string>();
  const entries = (data?.entries ?? []).filter((e) => {
    const key = `${e.mediaType}-${e.tmdbId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={PlayCircle}
        title="Nothing in progress"
        body="Hit play on any movie or show and it'll land here so you can pick up where you left off."
        cta={{ href: "/search", label: "Find something to watch" }}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {entries.map((e) => {
        const poster = tmdbImage(e.posterPath, "w342");
        const episodeLabel =
          e.mediaType === "tv" && e.seasonNumber != null && e.episodeNumber != null
            ? `S${e.seasonNumber} E${e.episodeNumber}`
            : null;
        return (
          <div key={`${e.mediaType}-${e.tmdbId}`} className="group/entry relative">
            <Link href={`/${e.mediaType}/${e.tmdbId}`}>
              <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-border bg-border shadow-soft transition-shadow group-hover/entry:shadow-lift">
                {poster && (
                  <Image
                    src={poster}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 45vw, 210px"
                    className="object-cover"
                  />
                )}
                <span className="absolute inset-0 grid place-items-center bg-ink/0 transition-colors group-hover/entry:bg-ink/40">
                  <PlayCircle className="size-10 text-white opacity-0 transition-opacity group-hover/entry:opacity-100" aria-hidden />
                </span>
              </div>
              <p className="mt-2 line-clamp-1 text-sm font-bold">{e.title}</p>
              <p className="text-xs font-bold text-muted">
                {[episodeLabel, timeAgo(e.watchedAt)].filter(Boolean).join(" · ")}
              </p>
            </Link>
            <button
              type="button"
              onClick={() => remove.mutate(e)}
              aria-label={`Remove ${e.title} from continue watching`}
              className="absolute -left-2 -top-2 z-10 grid size-8 place-items-center rounded-full border-2 border-border bg-card text-muted opacity-0 shadow-soft transition-all hover:text-ink focus-visible:opacity-100 group-hover/entry:opacity-100"
            >
              <X className="size-4" strokeWidth={3} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
