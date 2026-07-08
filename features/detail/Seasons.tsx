"use client";

import { useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import type { TmdbSeasonDetails, TmdbSeasonSummary } from "@/types/tmdb";
import { formatRuntime, tmdbImage } from "@/lib/media";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useLogWatch,
  useTitleHistory,
  useUnlogWatch,
  type TitlePayload,
} from "@/features/library/hooks";

function EpisodeList({
  tvId,
  seasonNumber,
  item,
  watched,
  signedIn,
}: {
  tvId: number;
  seasonNumber: number;
  item: TitlePayload;
  watched: Set<string>;
  signedIn: boolean;
}) {
  const logWatch = useLogWatch(item);
  const unlogWatch = useUnlogWatch(item);

  const { data, isLoading } = useQuery({
    queryKey: ["season", tvId, seasonNumber],
    queryFn: async (): Promise<TmdbSeasonDetails> => {
      const res = await fetch(`/api/tv/${tvId}/season/${seasonNumber}`);
      if (!res.ok) throw new Error("Season unavailable");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.episodes?.length) {
    return <p className="p-5 text-sm text-muted">No episode info yet.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {data.episodes.map((ep) => {
        const key = `${ep.season_number}-${ep.episode_number}`;
        const isWatched = watched.has(key);
        const still = tmdbImage(ep.still_path, "w185");
        return (
          <li key={ep.id} className="flex items-center gap-4 p-4">
            <div className="relative hidden aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-border sm:block">
              {still && <Image src={still} alt="" fill sizes="112px" className="object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                <span className="text-muted">{ep.episode_number}.</span> {ep.name}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
                {ep.overview || "No synopsis yet."}
              </p>
              <p className="mt-1 text-[11px] font-bold text-muted">
                {[ep.air_date, formatRuntime(ep.runtime)].filter(Boolean).join(" · ")}
              </p>
            </div>
            {signedIn && (
              <button
                type="button"
                aria-pressed={isWatched}
                aria-label={
                  isWatched
                    ? `Mark episode ${ep.episode_number} unwatched`
                    : `Mark episode ${ep.episode_number} watched`
                }
                onClick={() =>
                  isWatched
                    ? unlogWatch.mutate({ seasonNumber: ep.season_number, episodeNumber: ep.episode_number })
                    : logWatch.mutate({
                        seasonNumber: ep.season_number,
                        episodeNumber: ep.episode_number,
                        runtime: ep.runtime,
                      })
                }
                className={`grid size-9 shrink-0 place-items-center rounded-full border-2 transition-all ${
                  isWatched
                    ? "border-accent bg-accent text-ink"
                    : "border-border bg-card text-muted hover:border-accent"
                }`}
              >
                <Check className="size-4" strokeWidth={3} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Seasons({
  tvId,
  seasons,
  item,
}: {
  tvId: number;
  seasons: TmdbSeasonSummary[];
  item: TitlePayload;
}) {
  const { status: authStatus } = useSession();
  const signedIn = authStatus === "authenticated";
  const { data: history } = useTitleHistory(tvId, "tv", signedIn);
  const [open, setOpen] = useState<number | null>(null);

  const watched = new Set(
    (history?.entries ?? [])
      .filter((e) => e.seasonNumber != null && e.episodeNumber != null)
      .map((e) => `${e.seasonNumber}-${e.episodeNumber}`),
  );

  const realSeasons = seasons.filter((s) => s.season_number > 0);
  if (realSeasons.length === 0) return null;

  return (
    <div className="space-y-4">
      {realSeasons.map((season) => {
        const isOpen = open === season.season_number;
        const watchedCount = [...watched].filter(
          (k) => k.startsWith(`${season.season_number}-`),
        ).length;
        const pct = season.episode_count
          ? Math.round((watchedCount / season.episode_count) * 100)
          : 0;

        return (
          <div key={season.id} className="overflow-hidden rounded-3xl border-2 border-border bg-card">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : season.season_number)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-surface-hover"
            >
              <div className="min-w-0 flex-1">
                <p className="font-black">{season.name}</p>
                <p className="text-xs font-bold text-muted">
                  {season.episode_count} episodes
                  {season.air_date ? ` · ${season.air_date.slice(0, 4)}` : ""}
                  {signedIn && watchedCount > 0 ? ` · ${watchedCount} watched` : ""}
                </p>
                {signedIn && (
                  <div
                    className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-border"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${season.name} progress`}
                  >
                    <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
              {signedIn && pct === 100 && (
                <span className="inline-flex rotate-3 items-center gap-1 rounded-full border-2 border-ink bg-accent px-2.5 py-1 text-[11px] font-black shadow-offset-xs">
                  done <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
              )}
              <ChevronDown className={`size-5 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {isOpen && (
              <div className="border-t-2 border-border">
                <EpisodeList
                  tvId={tvId}
                  seasonNumber={season.season_number}
                  item={item}
                  watched={watched}
                  signedIn={signedIn}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
