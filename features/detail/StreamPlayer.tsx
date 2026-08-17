"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Lock, MonitorPlay, Play, RectangleHorizontal, X } from "lucide-react";
import type { TmdbSeasonDetails, TmdbSeasonSummary } from "@/types/tmdb";
import { tmdbImage } from "@/lib/media";
import { Skeleton } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useLogWatch, type TitlePayload } from "@/features/library/hooks";

// Same providers as the netflix project: 2embed.cc is what its search-result
// cards load (the reliably working path); vidsrc.su is its deep-link player.
const SERVERS = [
  {
    id: "2embed",
    label: "Server 1",
    movie: (tmdbId: number) => `https://www.2embed.cc/embed/${tmdbId}`,
    tv: (tmdbId: number, season: number, episode: number) =>
      `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`,
  },
  {
    id: "vidsrc",
    label: "Server 2",
    movie: (tmdbId: number) => `https://vidsrc.su/embed/movie/${tmdbId}`,
    tv: (tmdbId: number, season: number, episode: number) =>
      `https://vidsrc.su/embed/tv/${tmdbId}/${season}/${episode}`,
  },
] as const;

type SeasonLike = { season_number: number; episode_count: number };

/** Given a last-watched (season, episode), return the next episode to play,
 *  rolling into the next season when the current one is finished. Clamps to the
 *  finale at series end. `seasons` must be real seasons (no specials), in order. */
function nextEpisode(seasons: SeasonLike[], season: number, episode: number) {
  const idx = seasons.findIndex((s) => s.season_number === season);
  if (idx === -1) return { season, episode };
  if (episode < seasons[idx].episode_count) return { season, episode: episode + 1 };
  const next = seasons[idx + 1];
  if (next) return { season: next.season_number, episode: 1 };
  return { season, episode };
}

function ServerPicker({
  server,
  onChange,
}: {
  server: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-muted">
        <MonitorPlay className="size-4" aria-hidden /> Server
      </span>
      <div className="inline-flex overflow-hidden rounded-full border-2 border-border bg-card">
        {SERVERS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(i)}
            aria-pressed={server === i}
            className={`px-4 py-1.5 text-xs font-black transition-colors ${
              server === i
                ? "bg-accent text-ink"
                : "text-muted hover:bg-surface-hover"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <span className="hidden text-[11px] font-bold text-muted sm:inline">
        Stream broken? Try the other one.
      </span>
    </div>
  );
}

function SignInGate({ title, backdrop }: { title: string; backdrop: string | null }) {
  const pathname = usePathname();

  return (
    <div className="absolute inset-0">
      {backdrop && (
        <Image
          src={backdrop}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 640px"
          className="object-cover opacity-40"
        />
      )}
      <div className="absolute inset-0 grid place-items-center bg-ink/50 p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grid size-14 place-items-center rounded-full border-2 border-white/30 bg-ink/70">
            <Lock className="size-6 text-white" aria-hidden />
          </span>
          <p className="max-w-xs text-sm font-bold text-white">
            Sign in to watch {title}.
          </p>
          <Link
            href={`/login?from=${encodeURIComponent(pathname ?? "/")}`}
            className="rounded-full border-2 border-ink bg-accent px-5 py-2 text-sm font-black text-ink shadow-offset-xs transition-transform hover:scale-105"
          >
            Sign in to watch
          </Link>
        </div>
      </div>
    </div>
  );
}

function PlayerFrame({
  src,
  title,
  backdropPath,
  playing,
  onPlay,
  signedIn,
  frameless = false,
}: {
  src: string;
  title: string;
  backdropPath: string | null;
  playing: boolean;
  onPlay: () => void;
  signedIn: boolean;
  frameless?: boolean;
}) {
  const backdrop = tmdbImage(backdropPath, "w780");

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-ink ${
        frameless ? "" : "rounded-3xl border-2 border-border shadow-soft"
      }`}
    >
      {!signedIn ? (
        <SignInGate title={title} backdrop={backdrop} />
      ) : playing ? (
        <iframe
          src={src}
          title={`Watch ${title}`}
          scrolling="no"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture; scripts; same-origin; forms; presentation"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={onPlay}
          aria-label={`Play ${title}`}
          className="group absolute inset-0"
        >
          {backdrop && (
            <Image
              src={backdrop}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 640px"
              className="object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
            />
          )}
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-16 place-items-center rounded-full bg-accent shadow-lift transition-transform group-hover:scale-110">
              <Play className="ml-1 size-7 fill-ink" aria-hidden />
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-4 text-left">
            <span className="text-sm font-black text-white">{title}</span>
          </span>
        </button>
      )}
    </div>
  );
}

function TheatreToggle({
  theatre,
  onToggle,
}: {
  theatre: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={theatre}
      title={theatre ? "Exit theatre mode" : "Theatre mode"}
      className={`mb-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-black transition-colors ${
        theatre
          ? "border-ink bg-accent text-ink"
          : "border-border bg-card text-muted hover:border-accent hover:text-ink"
      }`}
    >
      <RectangleHorizontal className="size-4" aria-hidden />
      <span className="hidden sm:inline">Theatre</span>
    </button>
  );
}

/** Escape-to-exit + background scroll lock while theatre mode is active. */
function useTheatreMode(active: boolean, onExit: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [active, onExit]);
}

/**
 * Wraps the player. The slot always reserves the inline 16:9 space so the page
 * never jumps when toggling theatre. Only classNames change between modes — the
 * DOM nodes (and the iframe) are never unmounted, so the stream keeps playing.
 * In theatre mode the player is lifted into a fixed, dimmed overlay and sized to
 * the largest 16:9 box that fits the viewport (letterboxed, not stretched).
 *
 * `fixed` is viewport-relative here because no ancestor establishes a containing
 * block for it (the page wrapper uses `overflow-x-clip`, not `transform`).
 */
function TheatreSlot({
  theatre,
  onExit,
  children,
}: {
  theatre: boolean;
  onExit: () => void;
  children: React.ReactNode;
}) {
  useTheatreMode(theatre, onExit);

  return (
    <div className="relative aspect-video w-full">
      {/* Backdrop: dims the page and click-to-exits in theatre mode. */}
      <div
        onClick={theatre ? onExit : undefined}
        className={
          theatre
            ? "fixed inset-0 z-[200] flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm sm:p-8"
            : "absolute inset-0"
        }
      >
        {/* Player box. In theatre it's a centered 16:9 box bounded by viewport
            height (max-w derived from 100vh minus the 4rem of vertical padding). */}
        <div
          onClick={theatre ? (e) => e.stopPropagation() : undefined}
          className={
            theatre
              ? "relative aspect-video w-full max-w-[calc((100vh-4rem)*16/9)] overflow-hidden rounded-2xl shadow-soft"
              : "relative size-full"
          }
        >
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit theatre mode"
            className={
              theatre
                ? "absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-ink/70 text-white transition-transform hover:scale-105"
                : "hidden"
            }
          >
            <X className="size-5" aria-hidden />
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}

export function MovieStreamPlayer({
  tmdbId,
  title,
  backdropPath,
  item,
}: {
  tmdbId: number;
  title: string;
  backdropPath: string | null;
  item: TitlePayload;
}) {
  const [playing, setPlaying] = useState(false);
  const [server, setServer] = useState(0);
  const [theatre, setTheatre] = useState(false);
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const logWatch = useLogWatch(item);
  const exitTheatre = useCallback(() => setTheatre(false), []);
  const rootRef = useRef<HTMLDivElement>(null);

  const startPlaying = () => {
    setPlaying(true);
    logWatch.mutate({ source: "stream" });
  };

  // Resume deep-link from Continue Watching: `?play=1` autoplays and scrolls
  // the player into view.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("play") === "1") {
      startPlaying();
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="space-y-4">
      <SectionHeader
        overline="Stream it"
        title="Watch now"
        action={<TheatreToggle theatre={theatre} onToggle={() => setTheatre((t) => !t)} />}
      />

      <TheatreSlot theatre={theatre} onExit={exitTheatre}>
        <PlayerFrame
          src={SERVERS[server].movie(tmdbId)}
          title={title}
          backdropPath={backdropPath}
          playing={playing}
          onPlay={startPlaying}
          signedIn={signedIn}
          frameless={theatre}
        />
      </TheatreSlot>

      {signedIn && (
        <div className="rounded-3xl border-2 border-border bg-card p-4">
          <ServerPicker
            server={server}
            onChange={(i) => {
              setServer(i);
              setPlaying(true);
            }}
          />
        </div>
      )}
    </div>
  );
}

function EpisodeGrid({
  tvId,
  seasonNumber,
  episodeCount,
  episode,
  onPick,
}: {
  tvId: number;
  seasonNumber: number;
  episodeCount: number;
  episode: number;
  onPick: (n: number) => void;
}) {
  // Shares the ["season", ...] cache with the Seasons tracker below.
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: Math.min(episodeCount, 8) }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  const episodes =
    data?.episodes?.map((ep) => ({ n: ep.episode_number, name: ep.name })) ??
    Array.from({ length: episodeCount }, (_, i) => ({ n: i + 1, name: "" }));

  return (
    <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
      {episodes.map((ep) => {
        const selected = ep.n === episode;
        const pad = String(ep.n).padStart(2, "0");
        return (
          <button
            key={ep.n}
            type="button"
            onClick={() => onPick(ep.n)}
            aria-pressed={selected}
            title={ep.name ? `E${pad} · ${ep.name}` : `Episode ${ep.n}`}
            className={`flex items-center gap-2 truncate rounded-xl border-2 px-3 py-2.5 text-left text-xs font-bold transition-colors ${
              selected
                ? "border-ink bg-accent text-ink shadow-offset-xs"
                : "border-border bg-background hover:border-accent"
            }`}
          >
            <span className={`shrink-0 font-black ${selected ? "" : "text-muted"}`}>
              E{pad}
            </span>
            <span className="truncate">{ep.name}</span>
            {selected && <Play className="ml-auto size-3.5 shrink-0 fill-ink" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

export function TvStreamPlayer({
  tmdbId,
  title,
  backdropPath,
  seasons,
  item,
}: {
  tmdbId: number;
  title: string;
  backdropPath: string | null;
  seasons: TmdbSeasonSummary[];
  item: TitlePayload;
}) {
  const realSeasons = seasons.filter((s) => s.season_number > 0 && s.episode_count > 0);
  const [season, setSeason] = useState(realSeasons[0]?.season_number ?? 1);
  const [episode, setEpisode] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [server, setServer] = useState(0);
  const [theatre, setTheatre] = useState(false);
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const logWatch = useLogWatch(item);
  const exitTheatre = useCallback(() => setTheatre(false), []);
  const rootRef = useRef<HTMLDivElement>(null);

  const startPlaying = (s: number, e: number) => {
    setPlaying(true);
    logWatch.mutate({ seasonNumber: s, episodeNumber: e, source: "stream" });
  };

  // Resume deep-link from Continue Watching: `?s=&e=` selects an episode, and
  // `resume=next` advances to the following one (rolling over seasons). Then
  // autoplay and scroll the player into view.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = Number(params.get("s"));
    const e = Number(params.get("e"));
    if (!s || !e) return;
    const target =
      params.get("resume") === "next" ? nextEpisode(realSeasons, s, e) : { season: s, episode: e };
    setSeason(target.season);
    setEpisode(target.episode);
    startPlaying(target.season, target.episode);
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = realSeasons.find((s) => s.season_number === season);
  const episodeCount = current?.episode_count ?? 1;

  if (realSeasons.length === 0) return null;

  return (
    <div ref={rootRef} className="space-y-4">
      <SectionHeader
        overline="Stream it"
        title="Watch now"
        action={<TheatreToggle theatre={theatre} onToggle={() => setTheatre((t) => !t)} />}
      />

      <TheatreSlot theatre={theatre} onExit={exitTheatre}>
        <PlayerFrame
          src={SERVERS[server].tv(tmdbId, season, episode)}
          title={`${title} · S${season} E${episode}`}
          backdropPath={backdropPath}
          playing={playing}
          onPlay={() => startPlaying(season, episode)}
          signedIn={signedIn}
          frameless={theatre}
        />
      </TheatreSlot>

      {signedIn && (
      <div className="space-y-4 rounded-3xl border-2 border-border bg-card p-4">
        <ServerPicker
          server={server}
          onChange={(i) => {
            setServer(i);
            setPlaying(true);
          }}
        />

        {/* Season tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Seasons">
          {realSeasons.map((s) => {
            const selected = s.season_number === season;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setSeason(s.season_number);
                  setEpisode(1);
                }}
                className={`shrink-0 rounded-full border-2 px-4 py-1.5 text-xs font-black transition-colors ${
                  selected
                    ? "border-ink bg-ink text-white"
                    : "border-border bg-background text-muted hover:border-accent"
                }`}
              >
                {s.name}
                <span className={`ml-1.5 ${selected ? "text-white/60" : "text-muted/70"}`}>
                  {s.episode_count}
                </span>
              </button>
            );
          })}
        </div>

        <EpisodeGrid
          tvId={tmdbId}
          seasonNumber={season}
          episodeCount={episodeCount}
          episode={episode}
          onPick={(n) => {
            setEpisode(n);
            startPlaying(season, n);
          }}
        />
      </div>
      )}
    </div>
  );
}
