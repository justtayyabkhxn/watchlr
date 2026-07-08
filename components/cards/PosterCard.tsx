"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Check, Star } from "lucide-react";
import type { MediaItem } from "@/types/tmdb";
import { formatRating, formatRuntime, genreName, releaseYear, tmdbImage } from "@/lib/media";
import { useLogWatch, useSetStatus, type TitlePayload } from "@/features/library/hooks";

function toPayload(item: MediaItem): TitlePayload {
  return {
    tmdbId: item.id,
    mediaType: item.mediaType,
    title: item.title,
    posterPath: item.posterPath,
    voteAverage: item.voteAverage,
    genreIds: item.genreIds,
    releaseDate: item.releaseDate,
  };
}

/** Hover quick actions: bookmark = want to watch, tick = already watched. */
function QuickActions({ item }: { item: MediaItem }) {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const payload = toPayload(item);
  const setStatus = useSetStatus(payload);
  const logWatch = useLogWatch(payload);
  const [saved, setSaved] = useState(false);
  const [watched, setWatched] = useState(false);

  const guard = (e: React.MouseEvent, run: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    if (authStatus !== "authenticated") {
      router.push("/login");
      return;
    }
    run();
  };

  const base =
    "grid size-8 place-items-center rounded-full border-2 border-ink shadow-offset-xs transition-all duration-150 hover:scale-110 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

  return (
    <span className="absolute left-2.5 top-2.5 z-10 flex flex-col gap-1.5 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
      <button
        type="button"
        title={saved ? "Saved to want-to-watch" : "Save to watch later"}
        aria-label={`Save ${item.title} to watch later`}
        onClick={(e) =>
          guard(e, () => {
            setStatus.mutate("want_to_watch");
            setSaved(true);
          })
        }
        className={`${base} ${saved ? "bg-accent" : "bg-card hover:bg-accent-soft"}`}
      >
        <Bookmark className={`size-4 ${saved ? "fill-ink" : ""}`} strokeWidth={2.5} aria-hidden />
      </button>
      <button
        type="button"
        title={watched ? "Marked as watched" : "Watched this already"}
        aria-label={`Mark ${item.title} as watched`}
        onClick={(e) =>
          guard(e, () => {
            logWatch.mutate(undefined);
            setStatus.mutate("completed");
            setWatched(true);
          })
        }
        className={`${base} ${watched ? "bg-accent" : "bg-card hover:bg-accent-soft"}`}
      >
        <Check className="size-4" strokeWidth={3} aria-hidden />
      </button>
    </span>
  );
}

export function PosterCard({
  item,
  sizes = "(max-width: 640px) 40vw, 176px",
  priority = false,
  className = "w-40 shrink-0 sm:w-44",
}: {
  item: MediaItem;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // touch devices have no hover — fetch meta when the card scrolls into view
  useEffect(() => {
    if (!window.matchMedia("(hover: none)").matches) return;
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHovered(true);
          io.disconnect();
        }
      },
      { rootMargin: "150px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const poster = tmdbImage(item.posterPath, "w342");
  const genre = item.genreIds.map(genreName).find(Boolean);

  // runtime / season count, fetched lazily on first hover and cached forever
  const { data: meta } = useQuery({
    queryKey: ["title-meta", item.mediaType, item.id],
    enabled: hovered,
    staleTime: Infinity,
    queryFn: async (): Promise<{ runtime: number | null; seasons: number | null }> => {
      const res = await fetch(`/api/title-meta?id=${item.id}&type=${item.mediaType}`);
      return res.json();
    },
  });

  const metaLabel =
    item.mediaType === "movie"
      ? meta?.runtime
        ? formatRuntime(meta.runtime)
        : null
      : meta?.seasons
        ? `${meta.seasons} season${meta.seasons === 1 ? "" : "s"}`
        : null;

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -6, rotate: item.id % 2 === 0 ? 1.5 : -1.5 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      ref={rootRef}
      onMouseEnter={() => setHovered(true)}
      className={`group ${className}`}
    >
      <Link
        href={`/${item.mediaType}/${item.id}`}
        className="block focus-visible:outline-accent"
        aria-label={`${item.title} (${releaseYear(item.releaseDate)})`}
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-3xl border border-border bg-border shadow-soft transition-shadow duration-300 group-hover:shadow-lift">
          {poster ? (
            <Image
              src={poster}
              alt=""
              fill
              sizes={sizes}
              priority={priority}
              onLoad={() => setLoaded(true)}
              draggable={false}
              className={`object-cover transition-all duration-500 ease-out group-hover:scale-[1.04] ${loaded ? "opacity-100" : "opacity-0"}`}
            />
          ) : (
            <div className="grid h-full place-items-center p-4 text-center text-sm font-bold text-muted">
              {item.title}
            </div>
          )}
          {!loaded && poster && (
            <div aria-hidden className="absolute inset-0 animate-pulse bg-border" />
          )}
          <QuickActions item={item} />
          {metaLabel && (
            <span className="absolute bottom-2.5 right-2.5 z-10 -rotate-1 rounded-full border-2 border-ink bg-card/95 px-2 py-1 text-[11px] font-black shadow-offset-xs transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
              {metaLabel}
            </span>
          )}
          {item.voteAverage > 0 && (
            <span className="absolute right-2.5 top-2.5 inline-flex rotate-3 items-center gap-1 rounded-full border-2 border-ink bg-accent-soft px-2 py-1 text-[11px] font-black shadow-offset-xs">
              <Star className="size-3 fill-ink" aria-hidden />
              {formatRating(item.voteAverage)}
            </span>
          )}
        </div>
        <h3 className="mt-3 line-clamp-1 text-sm font-bold leading-snug group-hover:underline group-hover:decoration-accent group-hover:decoration-2 group-hover:underline-offset-4">
          {item.title}
        </h3>
        <p className="mt-0.5 text-xs font-semibold text-muted">
          {releaseYear(item.releaseDate)}
          {genre ? ` · ${genre}` : ""}
        </p>
      </Link>
    </motion.div>
  );
}
