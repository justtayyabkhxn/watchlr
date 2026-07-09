"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Library, ListChecks, Trash2, X } from "lucide-react";
import { StickerField, type StickerSpec } from "@/features/decor/Doodads";

const PAGE_STICKERS: StickerSpec[] = [
  { icon: "bookmark", className: "right-[3%] top-16 hidden lg:block", tilt: -8, delay: "0.5s" },
  { icon: "heart", className: "right-[12%] top-44 hidden xl:block", tilt: 10, delay: "1.6s", size: "sm" },
];
import type { LibraryStatus } from "@/models/Watchlist";
import type { MediaItem } from "@/types/tmdb";
import { tmdbImage } from "@/lib/media";
import { PosterCard } from "@/components/cards/PosterCard";
import { PosterSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { WatchlistTriage } from "./WatchlistTriage";

const TABS: { value: LibraryStatus | "lists"; label: string }[] = [
  { value: "watching", label: "Watching" },
  { value: "want_to_watch", label: "Want to watch" },
  { value: "completed", label: "Completed" },
  { value: "favorite", label: "Favorites" },
  { value: "dropped", label: "Dropped" },
  { value: "hidden", label: "Hidden" },
  { value: "lists", label: "My lists" },
];

interface LibraryEntry {
  tmdbId: number;
  mediaType: "movie" | "tv";
  status: LibraryStatus;
  title: string;
  posterPath: string | null;
  voteAverage: number;
  genreIds: number[];
  releaseDate: string;
}

function toMediaItem(e: LibraryEntry): MediaItem {
  return {
    id: e.tmdbId,
    mediaType: e.mediaType,
    title: e.title,
    overview: "",
    posterPath: e.posterPath,
    backdropPath: null,
    releaseDate: e.releaseDate,
    voteAverage: e.voteAverage,
    genreIds: e.genreIds,
  };
}

function StatusGrid({ status }: { status: LibraryStatus }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["library", status],
    queryFn: async (): Promise<{ entries: LibraryEntry[] }> => {
      const res = await fetch(`/api/library?status=${status}`);
      if (!res.ok) throw new Error("Failed to load library");
      return res.json();
    },
  });

  const remove = useMutation({
    mutationFn: async (e: LibraryEntry) => {
      await fetch(`/api/library?tmdbId=${e.tmdbId}&mediaType=${e.mediaType}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library"] }),
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

  const entries = data?.entries ?? [];
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Library}
        title="Nothing here yet"
        body="Open any movie or show and pick a status — it'll show up in this shelf."
        cta={{ href: "/search", label: "Find something" }}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {entries.map((e) => (
        <div key={`${e.mediaType}-${e.tmdbId}`} className="group/entry relative">
          <PosterCard item={toMediaItem(e)} className="w-full" sizes="(max-width: 640px) 45vw, 210px" />
          <button
            type="button"
            onClick={() => remove.mutate(e)}
            aria-label={`Remove ${e.title} from library`}
            className="absolute -left-2 -top-2 z-10 grid size-8 place-items-center rounded-full border-2 border-border bg-card text-muted opacity-0 shadow-soft transition-all hover:text-ink focus-visible:opacity-100 group-hover/entry:opacity-100"
          >
            <X className="size-4" strokeWidth={3} />
          </button>
        </div>
      ))}
    </div>
  );
}

function CollectionsPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      const res = await fetch("/api/collections");
      if (!res.ok) throw new Error("Failed to load lists");
      return res.json() as Promise<{
        collections: {
          id: string;
          name: string;
          description: string;
          items: { tmdbId: number; mediaType: "movie" | "tv"; title: string; posterPath: string | null }[];
        }[];
      }>;
    },
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/collections?id=${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });

  const removeItem = useMutation({
    mutationFn: async ({ id, tmdbId, mediaType }: { id: string; tmdbId: number; mediaType: string }) => {
      await fetch("/api/collections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "remove", item: { tmdbId, mediaType } }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <PosterSkeleton key={i} />)}</div>;
  }

  const collections = data?.collections ?? [];
  if (collections.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No custom lists yet"
        body='Open any title and hit "Add to list" to start one — "comfort movies", "watch with mom", you get it.'
        cta={{ href: "/search", label: "Browse titles" }}
      />
    );
  }

  return (
    <div className="space-y-10">
      {collections.map((c) => (
        <section key={c.id}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">{c.name}</h2>
              <p className="text-xs font-bold text-muted">
                {c.items.length} title{c.items.length === 1 ? "" : "s"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => deleteList.mutate(c.id)}
              aria-label={`Delete list ${c.name}`}
              className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          {c.items.length === 0 ? (
            <p className="rounded-2xl border-2 border-dashed border-border p-5 text-sm text-muted">
              Empty list — add titles from any movie or show page.
            </p>
          ) : (
            <div className="no-scrollbar -mx-6 flex gap-4 overflow-x-auto px-6">
              {c.items.map((item) => (
                <div key={`${item.mediaType}-${item.tmdbId}`} className="group/item relative w-28 shrink-0">
                  <Link href={`/${item.mediaType}/${item.tmdbId}`}>
                    <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-border bg-border shadow-soft transition-shadow group-hover/item:shadow-lift">
                      {item.posterPath && (
                        <Image
                          src={tmdbImage(item.posterPath, "w185")!}
                          alt=""
                          fill
                          sizes="112px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-xs font-bold">{item.title}</p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeItem.mutate({ id: c.id, tmdbId: item.tmdbId, mediaType: item.mediaType })}
                    aria-label={`Remove ${item.title} from ${c.name}`}
                    className="absolute -left-1.5 -top-1.5 grid size-6 place-items-center rounded-full border border-border bg-card text-muted opacity-0 shadow-soft transition-all hover:text-ink focus-visible:opacity-100 group-hover/item:opacity-100"
                  >
                    <X className="size-3" strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

export function LibraryView() {
  const [tab, setTab] = useState<LibraryStatus | "lists">("watching");

  return (
    <div className="relative mx-auto max-w-6xl px-6 pb-24">
      <StickerField items={PAGE_STICKERS} />
      <header className="pb-8 pt-14">
        <p className="overline-track text-accent">Your shelves</p>
        <h1 className="text-offset mt-2 text-4xl font-black tracking-tight sm:text-6xl">Library</h1>
      </header>

      <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Library shelves">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-full px-4.5 py-2 text-sm font-bold transition-colors ${
              tab === t.value
                ? "-rotate-1 bg-ink text-white shadow-offset-xs"
                : "border-2 border-border bg-card text-muted hover:bg-surface-hover hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "want_to_watch" && <WatchlistTriage />}
      {tab === "lists" ? <CollectionsPanel /> : <StatusGrid status={tab} key={tab} />}
    </div>
  );
}
