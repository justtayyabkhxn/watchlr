import { KeyRound, History, Wand2 } from "lucide-react";
import type { MediaItem } from "@/types/tmdb";
import {
  getMovieDetails,
  getNowPlaying,
  getPopularToday,
  getTopRated,
  getTrending,
  getTvDetails,
  getUpcoming,
  normalizeMulti,
} from "@/lib/tmdb";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { WatchHistory } from "@/models/WatchHistory";
import { Watchlist } from "@/models/Watchlist";
import { Rail } from "@/components/cards/Rail";
import { PosterCard } from "@/components/cards/PosterCard";
import { PosterSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export const RAIL_KINDS = {
  trendingMovies: () => getTrending("movie"),
  trendingTv: () => getTrending("tv"),
  popularToday: () => getPopularToday(),
  topRated: () => getTopRated("movie"),
  upcoming: () => getUpcoming(),
  nowPlaying: () => getNowPlaying(),
} as const;

export type RailKind = keyof typeof RAIL_KINDS;

function TmdbErrorNote() {
  return (
    <div className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-border bg-card p-6">
      <span className="grid size-11 shrink-0 -rotate-6 place-items-center rounded-2xl bg-accent-soft">
        <KeyRound className="size-5" aria-hidden />
      </span>
      <p className="text-sm leading-relaxed text-muted">
        The movie data source isn&apos;t answering — check the api key in{" "}
        <code className="rounded bg-surface-hover px-1.5 py-0.5 font-bold text-ink">.env.local</code>{" "}
        and refresh.
      </p>
    </div>
  );
}

export async function MediaRail({
  kind,
  overline,
  title,
}: {
  kind: RailKind;
  overline: string;
  title: string;
}) {
  let items: MediaItem[];
  try {
    items = await RAIL_KINDS[kind]();
  } catch {
    return (
      <section className="mx-auto max-w-6xl px-6">
        <SectionHeader overline={overline} title={title} />
        <TmdbErrorNote />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6">
      <SectionHeader overline={overline} title={title} href="/search" />
      <Rail label={title}>
        {items.slice(0, 18).map((item) => (
          <PosterCard key={`${item.mediaType}-${item.id}`} item={item} />
        ))}
      </Rail>
    </section>
  );
}

/** Auth-gated: library titles marked as "watching", most recently touched first. */
export async function ContinueWatchingRail() {
  const session = await auth();

  const header = (
    <SectionHeader overline="Pick it back up" title="Continue watching" href="/library" />
  );

  if (!session?.user) {
    return (
      <section className="mx-auto max-w-6xl px-6">
        {header}
        <EmptyState
          icon={History}
          title="Your half-finished shows live here"
          body="Sign in and Watchlr keeps your place across every series and movie night."
          cta={{ href: "/login", label: "Sign in" }}
        />
      </section>
    );
  }

  await connectDB();
  const rows = await Watchlist.find({ userId: session.user.id, status: "watching" })
    .sort({ updatedAt: -1 })
    .limit(12)
    .lean();

  if (rows.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-6">
        {header}
        <EmptyState
          icon={History}
          title="Nothing in progress (yet)"
          body="Mark a title as “Watching” and it'll be waiting for you right here."
          cta={{ href: "/search", label: "Find something" }}
        />
      </section>
    );
  }

  const items: MediaItem[] = rows.map((r) => ({
    id: r.tmdbId,
    mediaType: r.mediaType,
    title: r.title,
    overview: "",
    posterPath: r.posterPath ?? null,
    backdropPath: null,
    releaseDate: r.releaseDate ?? "",
    voteAverage: r.voteAverage ?? 0,
    genreIds: r.genreIds ?? [],
  }));

  return (
    <section className="mx-auto max-w-6xl px-6">
      {header}
      <Rail label="Continue watching">
        {items.map((item) => (
          <PosterCard key={`${item.mediaType}-${item.id}`} item={item} />
        ))}
      </Rail>
    </section>
  );
}

/** Auth-gated: TMDB recommendations seeded from the user's recent history. */
export async function ForYouRail() {
  const session = await auth();

  const header = (
    <SectionHeader overline="Made for you" title="Recommendations" />
  );

  if (!session?.user) {
    return (
      <section className="mx-auto max-w-6xl px-6">
        {header}
        <EmptyState
          icon={Wand2}
          title="Recommendations that learn your taste"
          body="Sign in, watch a few things, and this rail starts pulling picks based on your history."
          cta={{ href: "/register", label: "Create account" }}
        />
      </section>
    );
  }

  await connectDB();
  const [seeds, libraryRows] = await Promise.all([
    WatchHistory.find({ userId: session.user.id })
      .sort({ watchedAt: -1 })
      .limit(3)
      .lean(),
    Watchlist.find({ userId: session.user.id }).select("tmdbId mediaType").lean(),
  ]);

  if (seeds.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-6">
        {header}
        <EmptyState
          icon={Wand2}
          title="Watch something first"
          body="Recommendations kick in after your first logged watch — go on, log one."
          cta={{ href: "/search", label: "Browse titles" }}
        />
      </section>
    );
  }

  const known = new Set(libraryRows.map((w) => `${w.mediaType}-${w.tmdbId}`));
  const seen = new Set<string>();
  const items: MediaItem[] = [];

  try {
    const details = await Promise.all(
      seeds.map((s) =>
        s.mediaType === "movie" ? getMovieDetails(s.tmdbId) : getTvDetails(s.tmdbId),
      ),
    );
    for (const d of details) {
      for (const raw of d.recommendations?.results ?? []) {
        const item = normalizeMulti(raw);
        if (!item) continue;
        const key = `${item.mediaType}-${item.id}`;
        if (seen.has(key) || known.has(key)) continue;
        seen.add(key);
        items.push(item);
      }
    }
  } catch {
    return (
      <section className="mx-auto max-w-6xl px-6">
        {header}
        <TmdbErrorNote />
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6">
      {header}
      <Rail label="Recommendations">
        {items.slice(0, 18).map((item) => (
          <PosterCard key={`${item.mediaType}-${item.id}`} item={item} />
        ))}
      </Rail>
    </section>
  );
}

export function RailSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="mb-6">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-9 w-64" />
      </div>
      <div className="no-scrollbar -mx-6 flex gap-5 overflow-hidden px-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <PosterSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
