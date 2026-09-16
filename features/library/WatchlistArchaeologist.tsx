"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Shovel, Trash2, Undo2, X } from "lucide-react";
import type { MediaItem } from "@/types/tmdb";
import { releaseYear, tmdbImage } from "@/lib/media";
import { PosterCard } from "@/components/cards/PosterCard";
import { PosterSkeleton } from "@/components/ui/Skeleton";
import { LoadingMessage } from "@/components/ui/LoadingMessage";

interface DugItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  genreIds: number[];
  age: string;
  reason: string;
}

interface Dig {
  stale: boolean;
  verdict: string;
  keep: DugItem[];
  clear: DugItem[];
}

const key = (i: DugItem) => `${i.mediaType}-${i.tmdbId}`;

function toMediaItem(p: DugItem): MediaItem {
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

/** A title on the chopping block. Spare it and it drops out of the clear set. */
function ClearRow({
  item,
  spared,
  onToggle,
}: {
  item: DugItem;
  spared: boolean;
  onToggle: () => void;
}) {
  const poster = tmdbImage(item.posterPath, "w92");
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border-2 p-2 transition-all duration-200 ${
        spared ? "border-ink bg-accent-soft/60" : "border-border bg-background"
      }`}
    >
      <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-border">
        {poster && (
          <Image
            src={poster}
            alt=""
            fill
            sizes="48px"
            draggable={false}
            className={`object-cover transition-opacity duration-200 ${spared ? "opacity-100" : "opacity-60"}`}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={`/${item.mediaType}/${item.tmdbId}`}
          prefetch={false}
          className={`line-clamp-1 text-sm font-bold hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-2 ${
            spared ? "" : "line-through decoration-muted/50"
          }`}
        >
          {item.title}
        </Link>
        <p className="line-clamp-1 text-[11px] font-bold text-muted">
          {releaseYear(item.releaseDate)} · sat here {item.age} · {item.reason}
        </p>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={spared}
        aria-label={spared ? `Put ${item.title} back on the clear list` : `Keep ${item.title}`}
        title={spared ? "back on the clear list" : "actually, keep this one"}
        className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-card shadow-offset-xs transition-all duration-150 hover:scale-110 hover:bg-accent-soft active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        {spared ? <Undo2 className="size-3.5" aria-hidden /> : <Check className="size-4" strokeWidth={3} aria-hidden />}
      </button>
    </li>
  );
}

/**
 * The watchlist archaeologist: audits a want-to-watch shelf that stopped
 * moving, argues for the few worth keeping, and clears the rest in one go.
 *
 * The clear list is opt-out rather than opt-in. Everything the model wrote
 * off is checked by default — that's the whole point of one button — but each
 * row can be spared before the button is pressed, because a bulk delete the
 * user can't steer is a bulk delete they won't press.
 */
export function WatchlistArchaeologist({ staleCount }: { staleCount: number }) {
  const qc = useQueryClient();
  const reduceMotion = useReducedMotion();
  const [dig, setDig] = useState<Dig | null>(null);
  const [spared, setSpared] = useState<Set<string>>(new Set());
  const [cleared, setCleared] = useState<number | null>(null);

  const run = useMutation({
    mutationFn: async (): Promise<Dig> => {
      const res = await fetch("/api/ai/archaeology", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "The dig failed.");
      return { stale: json.stale, verdict: json.verdict ?? "", keep: json.keep ?? [], clear: json.clear ?? [] };
    },
    onSuccess: (d) => {
      setSpared(new Set());
      setDig(d);
    },
  });

  const doomed = (dig?.clear ?? []).filter((i) => !spared.has(key(i)));

  const clearThem = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/library", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "want_to_watch",
          items: doomed.map((i) => ({ tmdbId: i.tmdbId, mediaType: i.mediaType })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't clear those.");
      return json.deleted as number;
    },
    onSuccess: (deleted) => {
      setCleared(deleted);
      setDig(null);
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["library-status"] });
    },
  });

  function toggle(k: string) {
    setSpared((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="rounded-3xl border-2 border-ink bg-card p-6 shadow-offset sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 -rotate-6 place-items-center rounded-2xl border-2 border-ink bg-accent-soft shadow-offset-xs">
              <Shovel className="size-5" aria-hidden />
            </span>
            <div>
              <p className="overline-track text-accent">The watchlist archaeologist</p>
              <h2 className="text-lg font-black leading-tight">
                {staleCount} titles have been sitting there a while
              </h2>
            </div>
          </div>

          {!dig && !run.isPending && (
            <button
              type="button"
              onClick={() => {
                setCleared(null);
                run.mutate();
              }}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border-2 border-ink bg-accent px-5 text-sm font-black shadow-offset-xs transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-offset-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <Shovel className="size-4" aria-hidden />
              {cleared === null ? "Dig through the pile" : "Dig again"}
            </button>
          )}
        </div>

        {cleared !== null && !dig && !run.isPending && (
          <p className="mt-4 inline-block -rotate-1 rounded-xl bg-accent-soft px-3 py-1.5 text-sm font-bold text-ink">
            {cleared === 0
              ? "Nothing cleared — the shelf stands."
              : `Cleared ${cleared}. Your shelf is a plan again.`}
          </p>
        )}

        {run.isPending ? (
          <div className="mt-6">
            <LoadingMessage context="archaeology" className="mb-4" />
            <div className="grid grid-cols-3 gap-4 sm:max-w-xl">
              {Array.from({ length: 3 }).map((_, i) => (
                <PosterSkeleton key={i} index={i} className="w-full" />
              ))}
            </div>
          </div>
        ) : run.isError ? (
          <p className="mt-4 text-sm font-bold text-accent">{(run.error as Error).message}</p>
        ) : dig && !dig.stale ? (
          <p className="mt-4 text-sm font-bold text-muted">
            Nothing to dig up — this shelf is doing fine.
          </p>
        ) : dig ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 space-y-7"
          >
            {dig.verdict && (
              <p className="max-w-2xl -rotate-[0.4deg] rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-2 border-ink bg-accent-soft px-5 py-3 text-sm font-bold leading-relaxed text-ink shadow-offset-xs">
                {dig.verdict}
              </p>
            )}

            {dig.keep.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-black">Keep these — here&apos;s why</p>
                <div className="grid grid-cols-3 gap-4 sm:max-w-xl">
                  {dig.keep.map((p, i) => (
                    <div key={key(p)}>
                      <PosterCard
                        item={toMediaItem(p)}
                        className="w-full"
                        sizes="(max-width: 640px) 30vw, 190px"
                      />
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
            )}

            {dig.clear.length > 0 && (
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-black">
                    Clear the rest
                    <span className="ml-2 font-bold text-muted">
                      tick one to spare it
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDig(null);
                      setSpared(new Set());
                    }}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:bg-surface-hover hover:text-ink"
                  >
                    <X className="size-3.5" aria-hidden /> Leave it all
                  </button>
                </div>

                <ul className="grid gap-2 sm:grid-cols-2">
                  {dig.clear.map((item) => (
                    <ClearRow
                      key={key(item)}
                      item={item}
                      spared={spared.has(key(item))}
                      onToggle={() => toggle(key(item))}
                    />
                  ))}
                </ul>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={doomed.length === 0 || clearThem.isPending}
                    onClick={() => clearThem.mutate()}
                    className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-ink bg-ink px-6 text-sm font-black text-white shadow-offset-xs transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-accent hover:text-ink hover:shadow-offset-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Trash2 className="size-4" aria-hidden />
                    {clearThem.isPending
                      ? "Clearing…"
                      : doomed.length === 0
                        ? "Nothing selected"
                        : `Clear ${doomed.length} from my watchlist`}
                  </button>
                  {spared.size > 0 && (
                    <p className="text-xs font-bold text-muted">
                      {spared.size} spared — staying on the shelf.
                    </p>
                  )}
                </div>

                {clearThem.isError && (
                  <p className="mt-3 text-sm font-bold text-accent">
                    {(clearThem.error as Error).message}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
