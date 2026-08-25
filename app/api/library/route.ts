import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LIBRARY_STATUSES, Watchlist, type LibraryStatus } from "@/models/Watchlist";
import { WatchHistory } from "@/models/WatchHistory";
import { checkWatchMilestone } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await connectDB();
  const p = req.nextUrl.searchParams;
  const tmdbId = Number(p.get("tmdbId"));
  const mediaType = p.get("mediaType");

  // Single-title status lookup
  if (tmdbId && (mediaType === "movie" || mediaType === "tv")) {
    const entry = await Watchlist.findOne({ userId, tmdbId, mediaType }).lean();
    return NextResponse.json({ status: entry?.status ?? null });
  }

  // List by status (or everything)
  const status = p.get("status");
  const query: Record<string, unknown> = { userId };
  if (status && LIBRARY_STATUSES.includes(status as LibraryStatus)) {
    query.status = status;
  }
  const entries = await Watchlist.find(query).sort({ updatedAt: -1 }).limit(500).lean();
  return NextResponse.json({
    entries: entries.map((e) => ({
      tmdbId: e.tmdbId,
      mediaType: e.mediaType,
      status: e.status,
      title: e.title,
      posterPath: e.posterPath,
      voteAverage: e.voteAverage,
      genreIds: e.genreIds,
      releaseDate: e.releaseDate,
      updatedAt: e.updatedAt,
    })),
  });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { tmdbId, mediaType, status, title, posterPath, voteAverage, genreIds, releaseDate, runtime } = body ?? {};

  if (
    !Number.isInteger(tmdbId) ||
    (mediaType !== "movie" && mediaType !== "tv") ||
    !LIBRARY_STATUSES.includes(status) ||
    typeof title !== "string" ||
    !title
  ) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  await connectDB();
  await Watchlist.findOneAndUpdate(
    { userId, tmdbId, mediaType },
    {
      $set: {
        status,
        title,
        posterPath: posterPath ?? null,
        voteAverage: voteAverage ?? 0,
        genreIds: genreIds ?? [],
        releaseDate: releaseDate ?? "",
      },
    },
    { upsert: true },
  );

  // Cross-write: "completed" implies the title was watched, so make sure at
  // least one history row exists — otherwise the dashboard tells a user with
  // 50 completed films to "log their first watch". $setOnInsert keeps an
  // existing log's date/runtime untouched.
  if (status === "completed") {
    const result = await WatchHistory.updateOne(
      { userId, tmdbId, mediaType, seasonNumber: null, episodeNumber: null, source: "log" },
      {
        $setOnInsert: {
          title,
          posterPath: posterPath ?? null,
          runtime: Number(runtime) || 0,
          genreIds: genreIds ?? [],
          playCount: 1,
          watchedAt: new Date(),
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount > 0) {
      const total = await WatchHistory.countDocuments({ userId });
      await checkWatchMilestone(userId, total);
    }
  }

  return NextResponse.json({ ok: true, status });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const tmdbId = Number(p.get("tmdbId"));
  const mediaType = p.get("mediaType");
  if (!tmdbId || (mediaType !== "movie" && mediaType !== "tv")) {
    return NextResponse.json({ error: "Invalid params." }, { status: 400 });
  }

  await connectDB();
  await Watchlist.deleteOne({ userId, tmdbId, mediaType });
  return NextResponse.json({ ok: true });
}
