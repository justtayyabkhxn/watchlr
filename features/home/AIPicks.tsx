import { Types } from "mongoose";
import { KeyRound, Wand2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { WatchHistory } from "@/models/WatchHistory";
import { Watchlist } from "@/models/Watchlist";
import { Rating } from "@/models/Rating";
import { AIPick } from "@/models/AIPick";
import { generatePicks, MODEL_TAG, type RawPick } from "@/lib/ai";
import { searchMulti } from "@/lib/tmdb";
import type { MediaItem, MediaType } from "@/types/tmdb";
import { Rail } from "@/components/cards/Rail";
import { PosterCard } from "@/components/cards/PosterCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { User } from "@/models/User";
import { ReshuffleButton } from "./ReshuffleButton";

interface PickedItem {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
  genreIds: number[];
  reason: string;
}

function toMediaItem(p: PickedItem): MediaItem {
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

/** Resolve a model-suggested title to a real TMDB entry of the right kind. */
async function resolvePick(
  raw: RawPick,
  wantType: MediaType,
  known: Set<string>,
): Promise<PickedItem | null> {
  try {
    const { items } = await searchMulti(raw.title);
    const year = raw.year?.slice(0, 4);
    const match =
      items.find(
        (i) =>
          i.mediaType === wantType &&
          i.posterPath &&
          (!year || Math.abs(Number(i.releaseDate.slice(0, 4)) - Number(year)) <= 1),
      ) ?? items.find((i) => i.mediaType === wantType && i.posterPath);
    if (!match || known.has(`${match.mediaType}-${match.id}`)) return null;
    known.add(`${match.mediaType}-${match.id}`);
    return {
      tmdbId: match.id,
      mediaType: match.mediaType,
      title: match.title,
      posterPath: match.posterPath,
      releaseDate: match.releaseDate,
      voteAverage: match.voteAverage,
      genreIds: match.genreIds,
      reason: raw.reason,
    };
  } catch {
    return null;
  }
}

function PickRail({
  overline,
  title,
  items,
  action,
}: {
  overline: string;
  title: string;
  items: PickedItem[];
  action?: React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-6">
      <SectionHeader overline={overline} title={title} action={action} />
      <Rail label={title}>
        {items.map((p) => (
          <div key={`${p.mediaType}-${p.tmdbId}`} className="w-40 shrink-0 sm:w-44">
            <PosterCard item={toMediaItem(p)} className="w-full" />
            {p.reason && (
              <p className="mt-1.5 inline-block -rotate-1 rounded-xl bg-accent-soft/70 px-2 py-1 text-[11px] font-bold leading-snug text-ink">
                {p.reason}
              </p>
            )}
          </div>
        ))}
      </Rail>
    </section>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function AIPicks() {
  const session = await auth();

  if (!session?.user) {
    return (
      <section className="mx-auto max-w-6xl px-6">
        <SectionHeader overline="Made for you" title="AI picks" />
        <EmptyState
          icon={Wand2}
          title="An AI that learns your taste"
          body="Sign in, watch and rate a few things — the AI studies your history, favorites and stars, then picks movies and shows just for you."
          cta={{ href: "/register", label: "Create account" }}
        />
      </section>
    );
  }

  await connectDB();
  const uid = new Types.ObjectId(session.user.id);

  const [historyRows, libraryRows, ratings, user] = await Promise.all([
    WatchHistory.aggregate<{ _id: { tmdbId: number; mediaType: MediaType }; title: string; watchedAt: Date }>([
      { $match: { userId: uid } },
      { $sort: { watchedAt: -1 } },
      {
        $group: {
          _id: { tmdbId: "$tmdbId", mediaType: "$mediaType" },
          title: { $first: "$title" },
          watchedAt: { $first: "$watchedAt" },
        },
      },
      { $sort: { watchedAt: -1 } },
      { $limit: 40 },
    ]),
    Watchlist.find({ userId: uid }).lean(),
    Rating.find({ userId: uid }).lean(),
    User.findById(uid).lean(),
  ]);

  const hasSignals =
    historyRows.length > 0 || ratings.length > 0 || libraryRows.some((l) => l.status === "favorite");

  if (!hasSignals) {
    return (
      <section className="mx-auto max-w-6xl px-6">
        <SectionHeader overline="Made for you" title="AI picks" />
        <EmptyState
          icon={Wand2}
          title="Feed the algorithm (it's hungry)"
          body="Log a watch, favorite something, or drop a star rating — the AI needs at least one clue about your taste."
          cta={{ href: "/search", label: "Find something" }}
        />
      </section>
    );
  }

  // Build the taste profile the model sees.
  const titleOf = new Map<string, string>();
  for (const h of historyRows) titleOf.set(`${h._id.mediaType}-${h._id.tmdbId}`, h.title);
  for (const l of libraryRows) titleOf.set(`${l.mediaType}-${l.tmdbId}`, l.title);

  const watched = historyRows.map((h) => h.title);
  const loved = [
    ...libraryRows.filter((l) => l.status === "favorite").map((l) => l.title),
    ...ratings.filter((r) => r.value >= 8).map((r) => titleOf.get(`${r.mediaType}-${r.tmdbId}`) ?? ""),
  ].filter(Boolean);
  const avoided = [
    ...libraryRows.filter((l) => l.status === "dropped").map((l) => l.title),
    ...ratings.filter((r) => r.value <= 4).map((r) => titleOf.get(`${r.mediaType}-${r.tmdbId}`) ?? ""),
  ].filter(Boolean);

  // Everything they already know about — never recommend these.
  const known = new Set<string>([
    ...historyRows.map((h) => `${h._id.mediaType}-${h._id.tmdbId}`),
    ...libraryRows.map((l) => `${l.mediaType}-${l.tmdbId}`),
    ...ratings.map((r) => `${r.mediaType}-${r.tmdbId}`),
  ]);

  const signature = `${MODEL_TAG}|${historyRows.length}|${ratings.length}|${libraryRows.length}|${
    historyRows[0] ? `${historyRows[0]._id.mediaType}-${historyRows[0]._id.tmdbId}` : "none"
  }`;

  // Serve the cache while it matches the taste signature and is <24h old.
  const cached = await AIPick.findOne({ userId: uid }).lean();
  let movies: PickedItem[];
  let shows: PickedItem[];

  if (
    cached &&
    cached.signature === signature &&
    Date.now() - new Date(cached.updatedAt).getTime() < DAY_MS &&
    (cached.movies.length > 0 || cached.shows.length > 0)
  ) {
    movies = cached.movies as PickedItem[];
    shows = cached.shows as PickedItem[];
  } else {
    try {
      const raw = await generatePicks({
        watched,
        loved,
        avoided,
        genres: user?.favoriteGenres ?? [],
      });
      movies = (
        await Promise.all(raw.movies.map((p) => resolvePick(p, "movie", known)))
      ).filter((p): p is PickedItem => p !== null).slice(0, 12);
      shows = (
        await Promise.all(raw.shows.map((p) => resolvePick(p, "tv", known)))
      ).filter((p): p is PickedItem => p !== null).slice(0, 12);

      if (movies.length > 0 || shows.length > 0) {
        await AIPick.findOneAndUpdate(
          { userId: uid },
          { $set: { signature, movies, shows, model: MODEL_TAG } },
          { upsert: true },
        );
      }
    } catch {
      // Model or TMDB unavailable — fall back to stale cache if any.
      if (cached && (cached.movies.length > 0 || cached.shows.length > 0)) {
        movies = cached.movies as PickedItem[];
        shows = cached.shows as PickedItem[];
      } else {
        return (
          <section className="mx-auto max-w-6xl px-6">
            <SectionHeader overline="Made for you" title="AI picks" />
            <div className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-border bg-card p-6">
              <span className="grid size-11 shrink-0 -rotate-6 place-items-center rounded-2xl border-2 border-ink bg-accent-soft shadow-offset-xs">
                <KeyRound className="size-5" aria-hidden />
              </span>
              <p className="text-sm leading-relaxed text-muted">
                The AI picker is napping — check{" "}
                <code className="rounded bg-surface-hover px-1.5 py-0.5 font-bold text-ink">GROQ_API_KEY</code>{" "}
                and your connection, then refresh.
              </p>
            </div>
          </section>
        );
      }
    }
  }

  return (
    <>
      <PickRail
        overline="The AI read your history"
        title="AI picks: movies"
        items={movies}
        action={movies.length > 0 ? <ReshuffleButton /> : undefined}
      />
      <PickRail
        overline="Based on your stars & favorites"
        title="AI picks: shows"
        items={shows}
        action={movies.length === 0 ? <ReshuffleButton /> : undefined}
      />
    </>
  );
}
