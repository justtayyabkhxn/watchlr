import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { WatchHistory } from "@/models/WatchHistory";
import { Watchlist } from "@/models/Watchlist";
import { Review } from "@/models/Review";
import { Rating } from "@/models/Rating";
import { GENRES } from "@/lib/media";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await connectDB();
  const uid = new Types.ObjectId(userId);
  const now = new Date();
  const heatmapStart = new Date(now);
  heatmapStart.setDate(now.getDate() - 139); // 20 weeks
  heatmapStart.setHours(0, 0, 0, 0);

  const [totalsAgg, dailyAgg, genreAgg, recent, completed, reviews, ratings] =
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
        {
          $project: {
            watches: 1,
            minutes: 1,
            titles: { $size: "$titleSet" },
          },
        },
      ]),
      WatchHistory.aggregate<{ _id: string; count: number; minutes: number }>([
        { $match: { userId: uid, watchedAt: { $gte: heatmapStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$watchedAt" } },
            count: { $sum: 1 },
            minutes: { $sum: "$runtime" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      WatchHistory.aggregate<{ _id: number; count: number }>([
        { $match: { userId: uid } },
        { $unwind: "$genreIds" },
        { $group: { _id: "$genreIds", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      WatchHistory.find({ userId: uid })
        .sort({ watchedAt: -1 })
        .limit(10)
        .lean(),
      Watchlist.countDocuments({ userId: uid, status: "completed" }),
      Review.countDocuments({ userId: uid }),
      Rating.countDocuments({ userId: uid }),
    ]);

  return NextResponse.json({
    totals: {
      watches: totalsAgg[0]?.watches ?? 0,
      minutes: totalsAgg[0]?.minutes ?? 0,
      titles: totalsAgg[0]?.titles ?? 0,
      completed,
      reviews,
      ratings,
    },
    daily: dailyAgg.map((d) => ({ date: d._id, count: d.count, minutes: d.minutes })),
    genres: genreAgg.map((g) => ({
      name: GENRES[g._id] ?? "Other",
      count: g.count,
    })),
    recent: recent.map((r) => ({
      tmdbId: r.tmdbId,
      mediaType: r.mediaType,
      title: r.title,
      posterPath: r.posterPath,
      seasonNumber: r.seasonNumber ?? null,
      episodeNumber: r.episodeNumber ?? null,
      watchedAt: r.watchedAt,
    })),
  });
}
