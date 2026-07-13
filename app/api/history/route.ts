import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { WatchHistory } from "@/models/WatchHistory";

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
  const { tmdbId, mediaType, title, posterPath, runtime, genreIds, seasonNumber, episodeNumber, source } = body ?? {};

  if (
    !Number.isInteger(tmdbId) ||
    (mediaType !== "movie" && mediaType !== "tv") ||
    typeof title !== "string" ||
    !title
  ) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  await connectDB();
  await WatchHistory.findOneAndUpdate(
    {
      userId,
      tmdbId,
      mediaType,
      seasonNumber: seasonNumber ?? null,
      episodeNumber: episodeNumber ?? null,
    },
    {
      $set: {
        title,
        posterPath: posterPath ?? null,
        runtime: runtime ?? 0,
        genreIds: genreIds ?? [],
        source: source === "stream" ? "stream" : "log",
        watchedAt: new Date(),
      },
    },
    { upsert: true },
  );

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

  await connectDB();
  await WatchHistory.deleteMany({
    userId,
    tmdbId,
    mediaType,
    ...(seasonNumber !== null ? { seasonNumber: Number(seasonNumber) } : {}),
    ...(episodeNumber !== null ? { episodeNumber: Number(episodeNumber) } : {}),
  });

  return NextResponse.json({ ok: true });
}
