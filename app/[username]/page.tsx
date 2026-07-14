import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { Award, CalendarDays, Popcorn, TriangleAlert } from "lucide-react";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { WatchHistory } from "@/models/WatchHistory";
import { Watchlist } from "@/models/Watchlist";
import { Review } from "@/models/Review";
import { Rating } from "@/models/Rating";
import { getMovieDetails, getTvDetails } from "@/lib/tmdb";
import { formatHours, tmdbImage } from "@/lib/media";
import type { MediaItem, MediaType } from "@/types/tmdb";
import { Rail } from "@/components/cards/Rail";
import { PosterCard } from "@/components/cards/PosterCard";
import { SectionHeader } from "@/components/ui/SectionHeader";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

interface PublicReview {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  content: string;
  hasSpoilers: boolean;
  rating: number | null;
  createdAt: Date;
}

async function loadProfile(rawUsername: string) {
  const username = rawUsername.toLowerCase();
  if (!USERNAME_RE.test(username)) return null;

  await connectDB();
  const user = await User.findOne({ username }).lean();
  if (!user) return null;
  const uid = user._id as Types.ObjectId;

  const [totalsAgg, seenRows, favorites, reviewDocs, ratingsCount, myRatings] =
    await Promise.all([
      WatchHistory.aggregate<{ watches: number; minutes: number; titles: number }>([
        { $match: { userId: uid } },
        {
          $group: {
            _id: null,
            watches: { $sum: 1 },
            minutes: { $sum: "$runtime" },
            titleSet: { $addToSet: { tmdbId: "$tmdbId", mediaType: "$mediaType" } },
          },
        },
        { $project: { watches: 1, minutes: 1, titles: { $size: "$titleSet" } } },
      ]),
      WatchHistory.aggregate<{
        _id: { tmdbId: number; mediaType: MediaType };
        title: string;
        posterPath: string | null;
        genreIds: number[];
        watchedAt: Date;
      }>([
        { $match: { userId: uid } },
        { $sort: { watchedAt: -1 } },
        {
          $group: {
            _id: { tmdbId: "$tmdbId", mediaType: "$mediaType" },
            title: { $first: "$title" },
            posterPath: { $first: "$posterPath" },
            genreIds: { $first: "$genreIds" },
            watchedAt: { $first: "$watchedAt" },
          },
        },
        { $sort: { watchedAt: -1 } },
        { $limit: 18 },
      ]),
      Watchlist.find({ userId: uid, status: "favorite" })
        .sort({ updatedAt: -1 })
        .limit(18)
        .lean(),
      Review.find({ userId: uid }).sort({ createdAt: -1 }).limit(10).lean(),
      Rating.countDocuments({ userId: uid }),
      Rating.find({ userId: uid }).lean(),
    ]);

  const ratingByTitle = new Map(
    myRatings.map((r) => [`${r.mediaType}-${r.tmdbId}`, r.value]),
  );

  // Reviews don't store title/poster — resolve from TMDB (cached fetches).
  const reviews: PublicReview[] = await Promise.all(
    reviewDocs.map(async (r) => {
      let title = `${r.mediaType} #${r.tmdbId}`;
      let posterPath: string | null = null;
      try {
        if (r.mediaType === "movie") {
          const d = await getMovieDetails(r.tmdbId);
          title = d.title;
          posterPath = d.poster_path;
        } else {
          const d = await getTvDetails(r.tmdbId);
          title = d.name;
          posterPath = d.poster_path;
        }
      } catch {
        // TMDB unreachable — fall back to the id label
      }
      return {
        id: String(r._id),
        tmdbId: r.tmdbId,
        mediaType: r.mediaType,
        title,
        posterPath,
        content: r.content,
        hasSpoilers: r.hasSpoilers,
        rating: ratingByTitle.get(`${r.mediaType}-${r.tmdbId}`) ?? null,
        createdAt: r.createdAt,
      };
    }),
  );

  const totals = {
    watches: totalsAgg[0]?.watches ?? 0,
    minutes: totalsAgg[0]?.minutes ?? 0,
    titles: totalsAgg[0]?.titles ?? 0,
    reviews: reviewDocs.length,
    ratings: ratingsCount,
  };

  const seen: MediaItem[] = seenRows.map((r) => ({
    id: r._id.tmdbId,
    mediaType: r._id.mediaType,
    title: r.title,
    overview: "",
    posterPath: r.posterPath,
    backdropPath: null,
    releaseDate: "",
    voteAverage: 0,
    genreIds: r.genreIds ?? [],
  }));

  const favs: MediaItem[] = favorites.map((f) => ({
    id: f.tmdbId,
    mediaType: f.mediaType,
    title: f.title,
    overview: "",
    posterPath: f.posterPath ?? null,
    backdropPath: null,
    releaseDate: f.releaseDate,
    voteAverage: f.voteAverage,
    genreIds: f.genreIds,
  }));

  return {
    name: user.name,
    username: user.username!,
    bio: user.bio,
    favoriteGenres: user.favoriteGenres,
    favoriteActors: user.favoriteActors,
    createdAt: user.createdAt,
    totals,
    seen,
    favorites: favs,
    reviews,
  };
}

const ACHIEVEMENTS = (t: { watches: number; minutes: number; titles: number; reviews: number; ratings: number }) =>
  [
    { name: "First frame", earned: t.watches >= 1 },
    { name: "Double digits", earned: t.watches >= 10 },
    { name: "Century club", earned: t.watches >= 100 },
    { name: "Day one", earned: t.minutes >= 1440 },
    { name: "Critic", earned: t.reviews >= 3 },
    { name: "Judge", earned: t.ratings >= 10 },
    { name: "Explorer", earned: t.titles >= 25 },
  ].filter((a) => a.earned);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username.toLowerCase()}` };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await loadProfile(decodeURIComponent(username));
  if (!profile) notFound();

  const earned = ACHIEVEMENTS(profile.totals);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24">
      {/* header */}
      <header className="flex flex-wrap items-center gap-6 pb-10 pt-10 sm:pt-14">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <span className="grid size-16 shrink-0 -rotate-6 place-items-center rounded-2xl border-2 border-ink bg-accent text-2xl font-black shadow-offset-sm sm:size-24 sm:rounded-3xl sm:text-4xl">
            {profile.name[0]}
          </span>
          <div className="min-w-0">
            <p className="overline-track flex items-center gap-1.5 text-accent">
              <CalendarDays className="size-3.5" aria-hidden />
              member since {new Date(profile.createdAt).getFullYear()}
            </p>
            <h1 className="text-offset mt-1 truncate text-2xl font-black tracking-tight sm:text-5xl">
              {profile.name}
            </h1>
            <p className="mt-1 text-xs font-bold text-muted sm:text-sm">
              <span className="inline-block -rotate-1 rounded-full border-2 border-ink bg-accent-soft px-2 py-0.5 text-xs font-black text-ink shadow-offset-xs">
                @{profile.username}
              </span>
            </p>
          </div>
        </div>
        {profile.bio && (
          <p className="w-full max-w-xl text-sm leading-relaxed text-muted">{profile.bio}</p>
        )}
        {profile.favoriteGenres.length > 0 && (
          <div className="flex w-full flex-wrap gap-2">
            {profile.favoriteGenres.map((g) => (
              <span key={g} className="rounded-full border-2 border-border bg-card px-3 py-1 text-xs font-bold">
                {g}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {[
          [formatHours(profile.totals.minutes), "watched", "-rotate-1"],
          [String(profile.totals.watches), "watches logged", ""],
          [String(profile.totals.titles), "unique titles", "rotate-1"],
          [String(profile.totals.reviews), "reviews", ""],
        ].map(([value, label, rotate]) => (
          <div key={label} className={`rounded-3xl border-2 border-ink bg-card p-4 shadow-offset sm:p-6 ${rotate}`}>
            <p className="text-offset text-3xl font-black tracking-tight sm:text-5xl">{value}</p>
            <p className="mt-1 text-xs font-black text-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* achievements */}
      {earned.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {earned.map((a) => (
            <span
              key={a.name}
              className="inline-flex -rotate-1 items-center gap-1.5 rounded-full border-2 border-ink bg-accent-soft px-3 py-1.5 text-xs font-black shadow-offset-xs"
            >
              <Award className="size-3.5" aria-hidden />
              {a.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-16 space-y-16">
        {/* everything they've seen */}
        <section>
          <SectionHeader overline={`what @${profile.username} watches`} title="Recently seen" />
          {profile.seen.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Popcorn className="size-4" aria-hidden />
              Nothing logged yet — the popcorn is still unpopped.
            </p>
          ) : (
            <Rail label={`Titles ${profile.name} has seen`}>
              {profile.seen.map((item) => (
                <PosterCard key={`${item.mediaType}-${item.id}`} item={item} />
              ))}
            </Rail>
          )}
        </section>

        {/* favorites */}
        {profile.favorites.length > 0 && (
          <section>
            <SectionHeader overline="certified bangers" title="Favorites" />
            <Rail label={`${profile.name}'s favorites`}>
              {profile.favorites.map((item) => (
                <PosterCard key={`${item.mediaType}-${item.id}`} item={item} />
              ))}
            </Rail>
          </section>
        )}

        {/* reviews */}
        <section>
          <SectionHeader overline="hot takes" title="Reviews" />
          {profile.reviews.length === 0 ? (
            <p className="text-sm text-muted">No reviews yet — opinions still marinating.</p>
          ) : (
            <ul className="space-y-4">
              {profile.reviews.map((r) => {
                const poster = tmdbImage(r.posterPath, "w92");
                return (
                  <li key={r.id} className="rounded-3xl border-2 border-border bg-card p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <Link
                        href={`/${r.mediaType}/${r.tmdbId}`}
                        prefetch={false}
                        className="relative block aspect-[2/3] w-10 shrink-0 overflow-hidden rounded-lg bg-border"
                      >
                        {poster && <Image src={poster} alt="" fill sizes="40px" className="object-cover" />}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/${r.mediaType}/${r.tmdbId}`}
                          prefetch={false}
                          className="line-clamp-1 text-sm font-black hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-4"
                        >
                          {r.title}
                        </Link>
                        <p className="text-xs font-bold text-muted">
                          {r.rating != null && (
                            <span className="mr-2 rounded-full bg-accent-soft px-2 py-0.5 font-black text-ink">
                              {r.rating}/10
                            </span>
                          )}
                          {new Date(r.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    {r.hasSpoilers ? (
                      <details className="group/spoiler">
                        <summary className="flex cursor-pointer items-center gap-2 rounded-2xl bg-surface-hover px-4 py-3 text-sm font-bold text-muted transition-colors hover:bg-accent-soft hover:text-ink group-open/spoiler:mb-3">
                          <TriangleAlert className="size-4 text-accent" aria-hidden />
                          Spoilers inside — tap to reveal
                        </summary>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.content}</p>
                      </details>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.content}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
