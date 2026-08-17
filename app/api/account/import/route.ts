import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Watchlist, LIBRARY_STATUSES } from "@/models/Watchlist";
import { Rating } from "@/models/Rating";
import { Review } from "@/models/Review";
import { Collection } from "@/models/Collection";
import { WatchHistory } from "@/models/WatchHistory";

const isMediaType = (v: unknown): v is "movie" | "tv" => v === "movie" || v === "tv";

/**
 * Merge a previously-exported JSON back into the account. Everything is upserted
 * by its natural key so re-importing is idempotent and never duplicates. Unknown
 * or malformed rows are skipped rather than failing the whole import.
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid file." }, { status: 400 });
  }

  await connectDB();
  const counts = { watchlist: 0, ratings: 0, reviews: 0, collections: 0, history: 0 };

  for (const w of Array.isArray(body.watchlist) ? body.watchlist : []) {
    if (
      !Number.isInteger(w?.tmdbId) ||
      !isMediaType(w?.mediaType) ||
      !LIBRARY_STATUSES.includes(w?.status) ||
      typeof w?.title !== "string"
    )
      continue;
    await Watchlist.updateOne(
      { userId, tmdbId: w.tmdbId, mediaType: w.mediaType },
      {
        $set: {
          status: w.status,
          title: w.title,
          posterPath: w.posterPath ?? null,
          voteAverage: w.voteAverage ?? 0,
          genreIds: Array.isArray(w.genreIds) ? w.genreIds : [],
          releaseDate: w.releaseDate ?? "",
        },
      },
      { upsert: true },
    );
    counts.watchlist++;
  }

  for (const r of Array.isArray(body.ratings) ? body.ratings : []) {
    if (
      !Number.isInteger(r?.tmdbId) ||
      !isMediaType(r?.mediaType) ||
      !Number.isInteger(r?.value) ||
      r.value < 1 ||
      r.value > 10
    )
      continue;
    await Rating.updateOne(
      { userId, tmdbId: r.tmdbId, mediaType: r.mediaType },
      { $set: { value: r.value } },
      { upsert: true },
    );
    counts.ratings++;
  }

  for (const r of Array.isArray(body.reviews) ? body.reviews : []) {
    if (!Number.isInteger(r?.tmdbId) || !isMediaType(r?.mediaType) || typeof r?.content !== "string")
      continue;
    await Review.updateOne(
      { userId, tmdbId: r.tmdbId, mediaType: r.mediaType },
      { $set: { content: r.content.slice(0, 4000), hasSpoilers: !!r.hasSpoilers } },
      { upsert: true },
    );
    counts.reviews++;
  }

  for (const c of Array.isArray(body.collections) ? body.collections : []) {
    if (typeof c?.name !== "string" || !c.name.trim()) continue;
    const rawItems: unknown[] = Array.isArray(c.items) ? c.items : [];
    const items = rawItems.filter(
      (it): it is { tmdbId: number; mediaType: "movie" | "tv"; title: string; posterPath: string | null } => {
        const o = it as Record<string, unknown>;
        return Number.isInteger(o?.tmdbId) && isMediaType(o?.mediaType) && typeof o?.title === "string";
      },
    );
    // Match on name so re-importing updates the same list rather than cloning it.
    await Collection.updateOne(
      { userId, name: c.name.trim().slice(0, 80) },
      {
        $set: {
          description: typeof c.description === "string" ? c.description.slice(0, 300) : "",
          items: items.map((it) => ({
            tmdbId: it.tmdbId,
            mediaType: it.mediaType,
            title: it.title,
            posterPath: it.posterPath ?? null,
          })),
        },
      },
      { upsert: true },
    );
    counts.collections++;
  }

  for (const h of Array.isArray(body.history) ? body.history : []) {
    if (!Number.isInteger(h?.tmdbId) || !isMediaType(h?.mediaType) || typeof h?.title !== "string")
      continue;
    await WatchHistory.updateOne(
      {
        userId,
        tmdbId: h.tmdbId,
        mediaType: h.mediaType,
        seasonNumber: h.seasonNumber ?? null,
        episodeNumber: h.episodeNumber ?? null,
      },
      {
        $set: {
          title: h.title,
          posterPath: h.posterPath ?? null,
          runtime: h.runtime ?? 0,
          genreIds: Array.isArray(h.genreIds) ? h.genreIds : [],
          source: h.source === "stream" ? "stream" : "log",
          watchedAt: h.watchedAt ? new Date(h.watchedAt) : new Date(),
        },
      },
      { upsert: true },
    );
    counts.history++;
  }

  return NextResponse.json({ ok: true, imported: counts });
}
