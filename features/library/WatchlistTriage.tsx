"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, Sparkles, Wand2, X } from "lucide-react";
import type { MediaItem } from "@/types/tmdb";
import { PosterCard } from "@/components/cards/PosterCard";
import { PosterSkeleton } from "@/components/ui/Skeleton";

interface TriagePick {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  genreIds: number[];
  reason: string;
}

const MOOD_IDEAS = [
  "i have 90 minutes and i'm tired",
  "something to laugh at, brain off",
  "date night, nothing weird",
  "rainy sunday, whole afternoon free",
];

function toMediaItem(p: TriagePick): MediaItem {
  return {
    id: p.tmdbId,
    mediaType: p.mediaType,
    title: p.title,
    overview: "",
    posterPath: p.posterPath,
    backdropPath: null,
    releaseDate: p.releaseDate,
    voteAverage: p.voteAverage,
    genreIds: p.genreIds,
  };
}

interface TriageResult {
  shelf: TriagePick[];
  fresh: TriagePick[];
}

function PickRow({ label, picks }: { label: string; picks: TriagePick[] }) {
  if (picks.length === 0) return null;
  return (
    <div>
      <p className="mb-3 text-sm font-black">{label}</p>
      <div className="grid grid-cols-3 gap-4 sm:max-w-xl">
        {picks.map((p, i) => (
          <div key={`${p.mediaType}-${p.tmdbId}`}>
            <PosterCard item={toMediaItem(p)} className="w-full" sizes="(max-width: 640px) 30vw, 190px" />
            <p
              className={`mt-1.5 inline-block rounded-xl bg-accent-soft/70 px-2 py-1 text-[11px] font-bold leading-snug text-ink ${
                i % 2 === 0 ? "-rotate-1" : "rotate-1"
              }`}
            >
              {p.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "what tonight?" — the AI rescues the pile AND brings new ideas. */
export function WatchlistTriage() {
  const [mood, setMood] = useState("");
  const [picks, setPicks] = useState<TriageResult | null>(null);

  const triage = useMutation({
    mutationFn: async (m: string): Promise<TriageResult> => {
      const res = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: m }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Triage failed.");
      return { shelf: json.shelf ?? [], fresh: json.fresh ?? [] };
    },
    onSuccess: (p) => setPicks(p),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const m = mood.trim();
    if (m.length >= 3 && !triage.isPending) triage.mutate(m);
  }

  return (
    <section className="mb-8 rounded-3xl border-2 border-ink bg-card p-6 shadow-offset">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 -rotate-6 place-items-center rounded-2xl border-2 border-ink bg-accent-soft shadow-offset-xs">
          <Wand2 className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-black leading-tight">Can&apos;t decide? Tell the AI your mood</h2>
          <p className="text-xs font-bold text-muted">
            It picks tonight&apos;s watch from this shelf — plus a few fresh ideas you don&apos;t have yet.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          placeholder="i have 90 minutes and i'm sad…"
          aria-label="Your mood tonight"
          maxLength={300}
          className="h-11 min-w-0 flex-1 rounded-full border-2 border-border bg-background px-4 text-sm placeholder:text-muted focus:border-ink focus:shadow-offset-xs focus:outline-none"
        />
        <button
          type="submit"
          disabled={triage.isPending || mood.trim().length < 3}
          aria-label="Pick for me"
          className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-ink bg-accent shadow-offset-xs transition-all duration-150 hover:scale-105 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
        >
          <Send className="size-4" aria-hidden />
        </button>
      </form>

      {!picks && !triage.isPending && (
        <div className="mt-3 flex flex-wrap gap-2">
          {MOOD_IDEAS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              className="rounded-full bg-surface-hover px-3 py-1.5 text-xs font-bold transition-colors hover:bg-accent-soft"
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {triage.isPending ? (
        <div className="mt-6">
          <p className="mb-4 flex items-center gap-2 text-sm font-bold text-muted">
            <Sparkles className="size-4 animate-pulse text-accent" aria-hidden />
            Digging through your pile…
          </p>
          <div className="grid grid-cols-3 gap-4 sm:max-w-xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <PosterSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : triage.isError ? (
        <p className="mt-4 text-sm font-bold text-accent">{(triage.error as Error).message}</p>
      ) : picks ? (
        <div className="mt-6 space-y-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-muted">Tonight&apos;s shortlist:</p>
            <button
              type="button"
              onClick={() => {
                setPicks(null);
                setMood("");
              }}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <X className="size-3.5" aria-hidden /> Clear
            </button>
          </div>
          <PickRow label="From your shelf" picks={picks.shelf} />
          <PickRow label="Or something new (not on your list yet)" picks={picks.fresh} />
        </div>
      ) : null}
    </section>
  );
}
