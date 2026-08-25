import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { WatchHistory } from "@/models/WatchHistory";
import { Watchlist } from "@/models/Watchlist";
import { checkWatchMilestone } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await connectDB();
  const p = req.nextUrl.searchParams;
  const tmdbId = Number(p.get("tmdbId"));
  const mediaType = p.get("mediaType");

  if (tmdbId && (mediaType === "movie" || mediaType === "tv")) {
    const rows = await WatchHistory.find({ userId, tmdbId, mediaType })
      .sort({ watchedAt: -1 })
      .lean();
    return NextResponse.json({
      entries: rows.map((r) => ({
        seasonNumber: r.seasonNumber ?? null,
        episodeNumber: r.episodeNumber ?? null,
        playCount: r.playCount ?? 1,
        watchedAt: r.watchedAt,
      })),
    });
  }

  const source = p.get("source");
  const rows = await WatchHistory.find({
    userId,
    ...(source === "stream" || source === "log" ? { source } : {}),
  })
    .sort({ watchedAt: -1 })
    .limit(200)
    .lean();
  return NextResponse.json({
    entries: rows.map((r) => ({
      tmdbId: r.tmdbId,
      mediaType: r.mediaType,
      title: r.title,
      posterPath: r.posterPath,
      runtime: r.runtime,
      seasonNumber: r.seasonNumber ?? null,
      episodeNumber: r.episodeNumber ?? null,
      watchedAt: r.watchedAt,
    })),
  });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const {
    tmdbId,
    mediaType,
    title,
    posterPath,
    runtime,
    genreIds,
    releaseDate,
    voteAverage,
    seasonNumber,
    episodeNumber,
    source,
  } = body ?? {};

  if (
    !Number.isInteger(tmdbId) ||
    (mediaType !== "movie" && mediaType !== "tv") ||
    typeof title !== "string" ||
    !title
  ) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const src = source === "stream" ? "stream" : "log";
  const runtimeNum = Number(runtime) || 0;

  await connectDB();
  // `source` is part of the key: a stream play and a manual log of the same
  // title live in separate rows, so one can't flip the other's source (which
  // hid titles from continue-watching) or rewrite its watchedAt.
  await WatchHistory.findOneAndUpdate(
    {
      userId,
      tmdbId,
      mediaType,
      seasonNumber: seasonNumber ?? null,
      episodeNumber: episodeNumber ?? null,
      source: src,
    },
    {
      $set: {
        title,
        posterPath: posterPath ?? null,
        genreIds: genreIds ?? [],
        watchedAt: new Date(),
        // don't let a runtime-less writer (poster quick-tick) zero out a
        // runtime a previous log recorded
        ...(runtimeNum > 0 ? { runtime: runtimeNum } : {}),
      },
      ...(runtimeNum > 0 ? {} : { $setOnInsert: { runtime: 0 } }),
      // rewatches count: re-logging the same entry increments instead of
      // being swallowed ($inc initializes to 1 on upsert-insert)
      $inc: { playCount: 1 },
    },
    { upsert: true },
  );

  // Cross-write: manually logging a full title as watched also files it on
  // the "completed" shelf, so dashboard/achievement counts that read the
  // Watchlist agree with the watch history. Never downgrade favorite/hidden.
  if (src === "log" && seasonNumber == null && episodeNumber == null) {
    await Watchlist.updateOne(
      { userId, tmdbId, mediaType, status: { $nin: ["favorite", "hidden", "completed"] } },
      { $set: { status: "completed" } },
    );
    await Watchlist.updateOne(
      { userId, tmdbId, mediaType },
      {
        $setOnInsert: {
          status: "completed",
          title,
          posterPath: posterPath ?? null,
          voteAverage: voteAverage ?? 0,
          genreIds: genreIds ?? [],
          releaseDate: releaseDate ?? "",
        },
      },
      { upsert: true },
    );
  }

  // Award achievement notifications as the user's watch count crosses milestones.
  const total = await WatchHistory.countDocuments({ userId });
  await checkWatchMilestone(userId, total);

  return NextResponse.json({ ok: true });
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

  const seasonNumber = p.get("seasonNumber");
  const episodeNumber = p.get("episodeNumber");
  // Optional source scoping — dismissing a continue-watching card passes
  // source=stream so it removes only the play markers, never the user's
  // manually-logged episode/watch history for the title.
  const source = p.get("source");

  await connectDB();
  await WatchHistory.deleteMany({
    userId,
    tmdbId,
    mediaType,
    ...(seasonNumber !== null ? { seasonNumber: Number(seasonNumber) } : {}),
    ...(episodeNumber !== null ? { episodeNumber: Number(episodeNumber) } : {}),
    ...(source === "stream" || source === "log" ? { source } : {}),
  });

  return NextResponse.json({ ok: true });
}
