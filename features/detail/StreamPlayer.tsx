"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Lock, MonitorPlay, Play } from "lucide-react";
import type { TmdbSeasonDetails, TmdbSeasonSummary } from "@/types/tmdb";
import { tmdbImage } from "@/lib/media";
import { Skeleton } from "@/components/ui/Skeleton";
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
}: {
  src: string;
  title: string;
  backdropPath: string | null;
  playing: boolean;
  onPlay: () => void;
  signedIn: boolean;
}) {
  const backdrop = tmdbImage(backdropPath, "w780");

  return (
    <div className="relative aspect-video overflow-hidden rounded-3xl border-2 border-border bg-ink shadow-soft">
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
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const logWatch = useLogWatch(item);

  const startPlaying = () => {
    setPlaying(true);
    logWatch.mutate({ source: "stream" });
  };

  return (
    <div className="space-y-4">
      <PlayerFrame
        src={SERVERS[server].movie(tmdbId)}
        title={title}
        backdropPath={backdropPath}
        playing={playing}
        onPlay={startPlaying}
        signedIn={signedIn}
      />
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
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const logWatch = useLogWatch(item);

  const startPlaying = (s: number, e: number) => {
    setPlaying(true);
    logWatch.mutate({ seasonNumber: s, episodeNumber: e, source: "stream" });
  };

  const current = realSeasons.find((s) => s.season_number === season);
  const episodeCount = current?.episode_count ?? 1;

  if (realSeasons.length === 0) return null;

  return (
    <div className="space-y-4">
      <PlayerFrame
        src={SERVERS[server].tv(tmdbId, season, episode)}
        title={`${title} · S${season} E${episode}`}
        backdropPath={backdropPath}
        playing={playing}
        onPlay={() => startPlaying(season, episode)}
        signedIn={signedIn}
      />

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
