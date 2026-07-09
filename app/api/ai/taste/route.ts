import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { WatchHistory } from "@/models/WatchHistory";
import { Watchlist } from "@/models/Watchlist";
import { Rating } from "@/models/Rating";
import { AITasteProfile } from "@/models/AITasteProfile";
import { generateTasteRoast, MODEL_TAG, type TasteSignals } from "@/lib/ai";
import { GENRES } from "@/lib/media";
import type { MediaType } from "@/types/tmdb";

export const maxDuration = 60;

async function buildSignals(uid: Types.ObjectId): Promise<{
  signals: TasteSignals;
  signature: string;
} | null> {
  const [historyRows, libraryRows, ratings] = await Promise.all([
    WatchHistory.aggregate<{
      _id: { tmdbId: number; mediaType: MediaType };
      title: string;
      watchedAt: Date;
      minutes: number;
      genreIds: number[];
    }>([
      { $match: { userId: uid } },
      { $sort: { watchedAt: -1 } },
      {
        $group: {
          _id: { tmdbId: "$tmdbId", mediaType: "$mediaType" },
          title: { $first: "$title" },
          watchedAt: { $first: "$watchedAt" },
          minutes: { $sum: "$runtime" },
          genreIds: { $first: "$genreIds" },
        },
      },
      { $sort: { watchedAt: -1 } },
      { $limit: 60 },
    ]),
    Watchlist.find({ userId: uid }).lean(),
    Rating.find({ userId: uid }).lean(),
  ]);

  // A roast needs material — don't judge three data points.
  if (historyRows.length + ratings.length < 3) return null;

  const titleOf = new Map<string, string>();
  for (const h of historyRows) titleOf.set(`${h._id.mediaType}-${h._id.tmdbId}`, h.title);
  for (const l of libraryRows) titleOf.set(`${l.mediaType}-${l.tmdbId}`, l.title);

  const loved = [
    ...libraryRows.filter((l) => l.status === "favorite").map((l) => l.title),
    ...ratings.filter((r) => r.value >= 8).map((r) => titleOf.get(`${r.mediaType}-${r.tmdbId}`) ?? ""),
  ].filter(Boolean);
  const avoided = [
    ...libraryRows.filter((l) => l.status === "dropped").map((l) => l.title),
    ...ratings.filter((r) => r.value <= 4).map((r) => titleOf.get(`${r.mediaType}-${r.tmdbId}`) ?? ""),
  ].filter(Boolean);

  const genreCount = new Map<string, number>();
  for (const h of historyRows) {
    for (const id of h.genreIds ?? []) {
      const name = GENRES[id];
      if (name) genreCount.set(name, (genreCount.get(name) ?? 0) + 1);
    }
  }
  const topGenres = [...genreCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  const minutes = historyRows.reduce((sum, h) => sum + (h.minutes ?? 0), 0);
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r.value, 0) / ratings.length) * 10) / 10
      : 0;

  const signals: TasteSignals = {
    watched: historyRows.map((h) => h.title),
    loved,
    avoided,
    topGenres,
    stats: {
      watches: historyRows.length,
      hours: Math.round(minutes / 60),
      completed: libraryRows.filter((l) => l.status === "completed").length,
      dropped: libraryRows.filter((l) => l.status === "dropped").length,
      ratings: ratings.length,
      avgRating,
    },
  };

  const signature = `${MODEL_TAG}|${historyRows.length}|${ratings.length}|${libraryRows.length}|${
    historyRows[0] ? `${historyRows[0]._id.mediaType}-${historyRows[0]._id.tmdbId}` : "none"
  }`;

  return { signals, signature };
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await connectDB();
  const uid = new Types.ObjectId(userId);

  const built = await buildSignals(uid);
  if (!built) return NextResponse.json({ insufficient: true });

  const cached = await AITasteProfile.findOne({ userId: uid }).lean();
  if (cached && cached.signature === built.signature) {
    return NextResponse.json({ content: cached.content, cached: true });
  }

  try {
    const content = await generateTasteRoast(built.signals);
    await AITasteProfile.findOneAndUpdate(
      { userId: uid },
      { $set: { signature: built.signature, content, model: MODEL_TAG } },
      { upsert: true },
    );
    return NextResponse.json({ content, cached: false });
  } catch (err) {
    // Model down — serve the stale roast rather than nothing.
    if (cached) return NextResponse.json({ content: cached.content, cached: true });
    const message =
      err instanceof Error && err.message.includes("GROQ_API_KEY")
        ? "The roast needs GROQ_API_KEY set in .env.local."
        : "The AI couldn't judge you right now. Try again in a moment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** Re-roast: drop the cache so the next GET writes a fresh one. */
export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await connectDB();
  await AITasteProfile.deleteOne({ userId: new Types.ObjectId(userId) });
  return NextResponse.json({ ok: true });
}
