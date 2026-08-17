import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Watchlist } from "@/models/Watchlist";
import { Rating } from "@/models/Rating";
import { Review } from "@/models/Review";
import { Collection } from "@/models/Collection";
import { WatchHistory } from "@/models/WatchHistory";

// Portable JSON of everything a user has created. Version tag lets import stay
// backward-compatible if the shape changes later.
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await connectDB();
  const [watchlist, ratings, reviews, collections, history] = await Promise.all([
    Watchlist.find({ userId }).lean(),
    Rating.find({ userId }).lean(),
    Review.find({ userId }).lean(),
    Collection.find({ userId }).lean(),
    WatchHistory.find({ userId }).lean(),
  ]);

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    watchlist: watchlist.map((w) => ({
      tmdbId: w.tmdbId,
      mediaType: w.mediaType,
      status: w.status,
      title: w.title,
      posterPath: w.posterPath,
      voteAverage: w.voteAverage,
      genreIds: w.genreIds,
      releaseDate: w.releaseDate,
    })),
    ratings: ratings.map((r) => ({
      tmdbId: r.tmdbId,
      mediaType: r.mediaType,
      value: r.value,
    })),
    reviews: reviews.map((r) => ({
      tmdbId: r.tmdbId,
      mediaType: r.mediaType,
      content: r.content,
      hasSpoilers: r.hasSpoilers,
    })),
    collections: collections.map((c) => ({
      name: c.name,
      description: c.description,
      items: c.items,
    })),
    history: history.map((h) => ({
      tmdbId: h.tmdbId,
      mediaType: h.mediaType,
      title: h.title,
      posterPath: h.posterPath,
      runtime: h.runtime,
      genreIds: h.genreIds,
      seasonNumber: h.seasonNumber ?? null,
      episodeNumber: h.episodeNumber ?? null,
      source: h.source,
      watchedAt: h.watchedAt,
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="watchlr-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
