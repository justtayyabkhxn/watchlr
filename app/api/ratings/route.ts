import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Rating } from "@/models/Rating";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const tmdbId = Number(p.get("tmdbId"));
  const mediaType = p.get("mediaType");
  if (!tmdbId || (mediaType !== "movie" && mediaType !== "tv")) {
    return NextResponse.json({ error: "Invalid params." }, { status: 400 });
  }

  await connectDB();
  const userId = await getUserId();

  const [mine, agg, buckets] = await Promise.all([
    userId ? Rating.findOne({ userId, tmdbId, mediaType }).lean() : null,
    Rating.aggregate<{ avg: number; count: number }>([
      { $match: { tmdbId, mediaType } },
      { $group: { _id: null, avg: { $avg: "$value" }, count: { $sum: 1 } } },
    ]),
    Rating.aggregate<{ _id: number; count: number }>([
      { $match: { tmdbId, mediaType } },
      { $group: { _id: "$value", count: { $sum: 1 } } },
    ]),
  ]);

  // Dense 1..10 histogram (index 0 = a rating of 1) so the client can render bars
  // without worrying about missing buckets.
  const distribution = Array.from({ length: 10 }, (_, i) => {
    const b = buckets.find((x) => x._id === i + 1);
    return b?.count ?? 0;
  });

  return NextResponse.json({
    mine: mine?.value ?? null,
    average: agg[0]?.avg ?? null,
    count: agg[0]?.count ?? 0,
    distribution,
  });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { tmdbId, mediaType, value } = body ?? {};
  if (
    !Number.isInteger(tmdbId) ||
    (mediaType !== "movie" && mediaType !== "tv") ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 10
  ) {
    return NextResponse.json({ error: "Rating must be 1–10." }, { status: 400 });
  }

  await connectDB();
  await Rating.findOneAndUpdate(
    { userId, tmdbId, mediaType },
    { $set: { value } },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
